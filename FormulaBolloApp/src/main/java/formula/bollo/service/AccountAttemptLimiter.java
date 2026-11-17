package formula.bollo.service;

import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.LongSupplier;
import java.util.function.Supplier;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;

class AccountAttemptLimiter {
    private static final int DEFAULT_RECOVERY_EMAIL_TOTAL = 10;

    private final Cache<String, Attempts> loginAccounts;
    private final Cache<String, Attempts> loginIps;
    private final Cache<String, Attempts> recoveryEmailIps;
    private final Cache<String, Attempts> recoveryEmails;
    private final Cache<String, Attempts> recoveryIps;
    private final long windowNanos;
    private final LongSupplier ticker;
    private final int loginAccountLimit;
    private final int loginIpLimit;
    private final int recoveryEmailLimit;
    private final int recoveryIpLimit;
    private final int recoveryEmailTotalLimit;
    private final ReentrantLock[] loginLocks = new ReentrantLock[64];
    private final ReentrantLock recoveryLock = new ReentrantLock();

    AccountAttemptLimiter(Duration window, int loginAccountLimit, int loginIpLimit,
            int recoveryEmailLimit, int recoveryIpLimit, LongSupplier ticker) {
        this(window, loginAccountLimit, loginIpLimit, recoveryEmailLimit, recoveryIpLimit,
                DEFAULT_RECOVERY_EMAIL_TOTAL, ticker);
    }

    // recoveryEmailLimit cuenta por correo+IP (una persona no se bloquea por lo que haga otra);
    // recoveryEmailTotalLimit es el tope del buzon desde todas las IPs, contra el bombardeo de correos.
    AccountAttemptLimiter(Duration window, int loginAccountLimit, int loginIpLimit,
            int recoveryEmailLimit, int recoveryIpLimit, int recoveryEmailTotalLimit, LongSupplier ticker) {
        if (window.isZero() || window.isNegative() || loginAccountLimit < 1 || loginIpLimit < 1
                || recoveryEmailLimit < 1 || recoveryIpLimit < 1 || recoveryEmailTotalLimit < 1) {
            throw new IllegalArgumentException("Los limites y la ventana deben ser positivos");
        }
        this.windowNanos = window.toNanos();
        this.ticker = ticker;
        this.loginAccountLimit = loginAccountLimit;
        this.loginIpLimit = loginIpLimit;
        this.recoveryEmailLimit = recoveryEmailLimit;
        this.recoveryIpLimit = recoveryIpLimit;
        this.recoveryEmailTotalLimit = recoveryEmailTotalLimit;
        for (int i = 0; i < loginLocks.length; i++) {
            loginLocks[i] = new ReentrantLock();
        }
        loginAccounts = cache(window);
        loginIps = cache(window);
        recoveryEmailIps = cache(window);
        recoveryEmails = cache(window);
        recoveryIps = cache(window);
    }

    private Cache<String, Attempts> cache(Duration window) {
        return Caffeine.newBuilder().maximumSize(100_000).expireAfterWrite(window)
                .ticker(ticker::getAsLong).build();
    }

    // La comprobacion y el registro del fallo son atomicos tambien entre peticiones concurrentes.
    // ReentrantLock y no synchronized: aqui dentro se consulta la BD y se hace BCrypt, y en Java 21
    // un synchronized fija el hilo virtual al hilo del sistema mientras espera.
    ResponseEntity<String> login(String username, String ip, Supplier<ResponseEntity<String>> authenticate) {
        ReentrantLock lock = loginLocks[(ip.hashCode() & Integer.MAX_VALUE) % loginLocks.length];
        lock.lock();
        try {
            String accountKey = normalize(username) + '\0' + ip;
            long retry = Math.max(retryAfter(loginAccounts, accountKey, loginAccountLimit),
                    retryAfter(loginIps, ip, loginIpLimit));
            if (retry > 0) {
                return limited(retry);
            }
            ResponseEntity<String> response = authenticate.get();
            if (response.getStatusCode().is2xxSuccessful()) {
                loginAccounts.invalidate(accountKey);
            } else if (response.getStatusCode().value() == 401) {
                increment(loginAccounts, accountKey);
                increment(loginIps, ip);
            }
            return response;
        } finally {
            lock.unlock();
        }
    }

    ResponseEntity<String> recovery(String email, String ip) {
        String normalizedEmail = normalize(email);
        String emailIpKey = normalizedEmail + '\0' + ip;
        recoveryLock.lock();
        try {
            long retry = Math.max(
                    Math.max(retryAfter(recoveryEmailIps, emailIpKey, recoveryEmailLimit),
                            retryAfter(recoveryEmails, normalizedEmail, recoveryEmailTotalLimit)),
                    retryAfter(recoveryIps, ip, recoveryIpLimit));
            if (retry > 0) {
                return limited(retry);
            }
            increment(recoveryEmailIps, emailIpKey);
            increment(recoveryEmails, normalizedEmail);
            increment(recoveryIps, ip);
            return null;
        } finally {
            recoveryLock.unlock();
        }
    }

    private long retryAfter(Cache<String, Attempts> cache, String key, int limit) {
        Attempts attempts = cache.getIfPresent(key);
        return attempts == null || attempts.count < limit ? 0
                : Math.max(1, (windowNanos - (ticker.getAsLong() - attempts.started) + 999_999_999L) / 1_000_000_000L);
    }

    private void increment(Cache<String, Attempts> cache, String key) {
        cache.get(key, ignored -> new Attempts(ticker.getAsLong())).count++;
    }

    private ResponseEntity<String> limited(long seconds) {
        return ResponseEntity.status(429).header(HttpHeaders.RETRY_AFTER, Long.toString(seconds))
                .body("Demasiados intentos. Intentalo mas tarde");
    }

    static String normalize(String value) {
        return value == null ? "" : value.strip().toLowerCase(Locale.ROOT);
    }

    private static class Attempts {
        private final long started;
        private int count;

        private Attempts(long started) {
            this.started = started;
        }
    }
}
