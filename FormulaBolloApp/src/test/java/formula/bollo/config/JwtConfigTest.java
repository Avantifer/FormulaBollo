package formula.bollo.config;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

class JwtConfigTest {
    private final JwtConfig jwt = new JwtConfig();

    @Test
    void thirtyOneByteSecretIsRejectedAtStartup() {
        ReflectionTestUtils.setField(jwt, "secret", "a".repeat(31));

        IllegalStateException exception = assertThrows(IllegalStateException.class, jwt::validateSecret);

        assertEquals("jwt.secret debe tener al menos 32 bytes", exception.getMessage());
    }

    @ParameterizedTest
    @ValueSource(strings = {"01234567890123456789012345678901", "éééééééééééééééé"})
    void thirtyTwoUtf8BytesAreAccepted(String secret) {
        ReflectionTestUtils.setField(jwt, "secret", secret);

        assertDoesNotThrow(jwt::validateSecret);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "                                "})
    void nullEmptyOrBlankSecretIsRejected(String secret) {
        ReflectionTestUtils.setField(jwt, "secret", secret);

        IllegalStateException exception = assertThrows(IllegalStateException.class, jwt::validateSecret);

        assertEquals("jwt.secret debe tener al menos 32 bytes", exception.getMessage());
    }
}
