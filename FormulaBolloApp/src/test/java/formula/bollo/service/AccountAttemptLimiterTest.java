package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Duration;
import java.util.ArrayList;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

class AccountAttemptLimiterTest {
    private final AtomicLong time = new AtomicLong();
    private final AccountAttemptLimiter limiter = new AccountAttemptLimiter(Duration.ofMinutes(15), 10, 30, 3, 20, time::get);
    private final Supplier<ResponseEntity<String>> badCredentials = () -> ResponseEntity.status(401).body("invalid");

    @Test
    void fiftyFailuresAcrossIpsBlockOnlyTheNormalizedAccountUntilTheWindowEnds() {
        for (int i = 0; i < 50; i++) {
            assertEquals(401, limiter.login(" Ana ", "ip" + i, badCredentials).getStatusCode().value());
        }
        ResponseEntity<String> blocked = limiter.login("ANA", "new-ip", () -> {
            fail("No autenticar ni con la contraseña correcta tras el limite total");
            return ResponseEntity.ok("token");
        });
        assertEquals(429, blocked.getStatusCode().value());
        assertEquals("900", blocked.getHeaders().getFirst("Retry-After"));
        assertEquals(200, limiter.login("other", "new-ip", () -> ResponseEntity.ok("token")).getStatusCode().value());

        time.addAndGet(Duration.ofMinutes(15).toNanos());
        assertEquals(200, limiter.login("ana", "new-ip", () -> ResponseEntity.ok("token")).getStatusCode().value());
    }

    @Test
    void successfulLoginDoesNotResetTheTotalAccountFailures() {
        for (int i = 0; i < 49; i++) {
            assertEquals(401, limiter.login("ana", "ip" + i, badCredentials).getStatusCode().value());
        }
        assertEquals(200, limiter.login("ana", "good-ip", () -> ResponseEntity.ok("token")).getStatusCode().value());
        assertEquals(401, limiter.login("ana", "last-ip", badCredentials).getStatusCode().value());
        assertEquals(429, limiter.login("ana", "new-ip", badCredentials).getStatusCode().value());
    }

    @Test
    void concurrentFailuresFromDifferentIpsAreAllCounted() throws Exception {
        try (var executor = Executors.newFixedThreadPool(8)) {
            var start = new CountDownLatch(1);
            var tasks = new ArrayList<Future<ResponseEntity<String>>>();
            for (int i = 0; i < 40; i++) {
                String ip = "ip" + i;
                tasks.add(executor.submit(() -> {
                    assertTrue(start.await(5, TimeUnit.SECONDS));
                    return limiter.login("ana", ip, badCredentials);
                }));
            }
            start.countDown();
            for (var task : tasks) {
                assertEquals(401, task.get(5, TimeUnit.SECONDS).getStatusCode().value());
            }
        }
        for (int i = 40; i < 50; i++) {
            assertEquals(401, limiter.login("ana", "ip" + i, badCredentials).getStatusCode().value());
        }
        assertEquals(429, limiter.login("ana", "new-ip", badCredentials).getStatusCode().value());
    }

    @Test
    void tenFailuresBlockTheNormalizedAccountAndIpUntilTheWindowEnds() {
        for (int i = 0; i < 10; i++) {
            assertEquals(401, limiter.login(" Ana ", "ip1", badCredentials).getStatusCode().value());
        }
        ResponseEntity<String> blocked = limiter.login("ANA", "ip1", () -> fail("No autenticar tras el limite"));
        assertEquals(429, blocked.getStatusCode().value());
        assertEquals("900", blocked.getHeaders().getFirst("Retry-After"));
        assertEquals(401, limiter.login("ana", "ip2", badCredentials).getStatusCode().value());
        time.addAndGet(Duration.ofMinutes(14).plusSeconds(59).toNanos());
        assertEquals("1", limiter.login("ana", "ip1", badCredentials).getHeaders().getFirst("Retry-After"));
        time.addAndGet(Duration.ofSeconds(1).toNanos());
        assertEquals(401, limiter.login("ana", "ip1", badCredentials).getStatusCode().value());
    }

    @Test
    void thirtyFailuresAcrossAccountsBlockTheIp() {
        for (int i = 0; i < 30; i++) {
            assertEquals(401, limiter.login("user" + i, "ip1", badCredentials).getStatusCode().value());
        }
        assertEquals(429, limiter.login("new-user", "ip1", badCredentials).getStatusCode().value());
        assertEquals(401, limiter.login("new-user", "ip2", badCredentials).getStatusCode().value());
    }

    @Test
    void successfulLoginResetsOnlyItsAccountCounter() {
        for (int i = 0; i < 9; i++) {
            limiter.login("ana", "ip1", badCredentials);
        }
        assertEquals(200, limiter.login("ana", "ip1", () -> ResponseEntity.ok("token")).getStatusCode().value());
        for (int i = 0; i < 10; i++) {
            assertEquals(401, limiter.login("ana", "ip1", badCredentials).getStatusCode().value());
        }
        assertEquals(429, limiter.login("ana", "ip1", badCredentials).getStatusCode().value());
        for (int i = 0; i < 11; i++) {
            assertEquals(401, limiter.login("other" + i, "ip1", badCredentials).getStatusCode().value());
        }
        assertEquals(429, limiter.login("last", "ip1", badCredentials).getStatusCode().value());
    }

    @Test
    void successfulLoginsDoNotCountAsFailures() {
        for (int i = 0; i < 40; i++) {
            assertEquals(200, limiter.login("ana", "ip1", () -> ResponseEntity.ok("token")).getStatusCode().value());
        }
    }

    @Test
    void recoveryUsesNormalizedEmailPerIpAndExpires() {
        assertNull(limiter.recovery(" Ana@Example.com ", "ip1"));
        assertNull(limiter.recovery("ana@example.com", "ip1"));
        assertNull(limiter.recovery("ANA@EXAMPLE.COM", "ip1"));
        ResponseEntity<String> blocked = limiter.recovery("ana@example.com", "ip1");
        assertEquals(429, blocked.getStatusCode().value());
        assertEquals("900", blocked.getHeaders().getFirst("Retry-After"));
        time.addAndGet(Duration.ofMinutes(15).toNanos());
        assertNull(limiter.recovery("ana@example.com", "ip1"));
    }

    @Test
    void twentyRecoveryRequestsAcrossEmailsBlockTheIp() {
        for (int i = 0; i < 20; i++) {
            assertNull(limiter.recovery("user" + i + "@example.com", "ip1"));
        }
        assertEquals(429, limiter.recovery("new@example.com", "ip1").getStatusCode().value());
        assertNull(limiter.recovery("new@example.com", "ip2"));
    }

    @Test
    void configuredLimitsAndWindowAreApplied() {
        AccountAttemptLimiter configured = new AccountAttemptLimiter(Duration.ofSeconds(30), 1, 2, 1, 2, time::get);
        assertEquals(401, configured.login("ana", "ip", badCredentials).getStatusCode().value());
        assertEquals("30", configured.login("ana", "ip", badCredentials).getHeaders().getFirst("Retry-After"));
        assertNull(configured.recovery("ana@example.com", "ip"));
        assertEquals("30", configured.recovery("ana@example.com", "ip").getHeaders().getFirst("Retry-After"));
    }

    @Test
    void loginOnAnotherIpCanProceedWhileAnAuthenticationIsWaiting() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch otherFinished = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> limiter.login("ana", "ip1", () -> {
                entered.countDown();
                try {
                    assertTrue(release.await(15, TimeUnit.SECONDS));
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    throw new AssertionError(exception);
                }
                return ResponseEntity.ok("token");
            }));
            assertTrue(entered.await(5, TimeUnit.SECONDS));
            var second = executor.submit(() -> {
                ResponseEntity<String> response = limiter.login("ana", "ip2", badCredentials);
                otherFinished.countDown();
                return response;
            });
            assertTrue(otherFinished.await(5, TimeUnit.SECONDS), "Otra IP no debe esperar al BCrypt de la primera");
            assertEquals(401, second.get(5, TimeUnit.SECONDS).getStatusCode().value());
            release.countDown();
            assertEquals(200, first.get(5, TimeUnit.SECONDS).getStatusCode().value());
        } finally {
            release.countDown();
            executor.shutdownNow();
        }
    }
}
