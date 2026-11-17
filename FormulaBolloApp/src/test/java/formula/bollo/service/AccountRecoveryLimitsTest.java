package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Duration;
import java.util.ArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;

class AccountRecoveryLimitsTest {
    private final AtomicLong time = new AtomicLong();
    private final AccountAttemptLimiter limiter = new AccountAttemptLimiter(
            Duration.ofMinutes(15), 10, 30, 3, 20, time::get);

    @Test
    void anotherIpCanRecoverAfterTheFirstIpReachesItsThreeRequestLimit() {
        assertNull(limiter.recovery(" ANA@EXAMPLE.COM ", "ip1"));
        assertNull(limiter.recovery("ana@example.com", "ip1"));
        assertNull(limiter.recovery("ANA@EXAMPLE.COM", "ip1"));
        assertEquals(429, limiter.recovery("ana@example.com", "ip1").getStatusCode().value());
        assertNull(limiter.recovery("ana@example.com", "ip2"));
    }

    @Test
    void tenRequestsAcrossIpsBlockTheNormalizedMailboxUntilTheWindowEnds() {
        for (int i = 0; i < 10; i++) {
            assertNull(limiter.recovery(" ANA@EXAMPLE.COM ", "ip" + i));
        }
        var blocked = limiter.recovery("ana@example.com", "other-ip");
        assertEquals(429, blocked.getStatusCode().value());
        assertEquals("900", blocked.getHeaders().getFirst("Retry-After"));
        assertNull(limiter.recovery("other@example.com", "other-ip"));
        time.addAndGet(Duration.ofMinutes(15).toNanos());
        assertNull(limiter.recovery("ana@example.com", "other-ip"));
    }

    @Test
    void concurrentRequestsRespectTheMailboxTotal() throws Exception {
        try (var executor = Executors.newFixedThreadPool(8)) {
            var start = new CountDownLatch(1);
            var tasks = new ArrayList<Future<Boolean>>();
            for (int i = 0; i < 40; i++) {
                String ip = "ip" + i;
                tasks.add(executor.submit(() -> {
                    assertTrue(start.await(5, TimeUnit.SECONDS));
                    return limiter.recovery("ana@example.com", ip) == null;
                }));
            }
            start.countDown();
            int accepted = 0;
            for (var task : tasks) if (task.get(5, TimeUnit.SECONDS)) accepted++;
            assertEquals(10, accepted);
        }
    }
}
