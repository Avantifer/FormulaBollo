package formula.bollo.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class TruncatingBCryptPasswordEncoderTest {
    private final TruncatingBCryptPasswordEncoder encoder = new TruncatingBCryptPasswordEncoder();
    private final BCryptPasswordEncoder standard = new BCryptPasswordEncoder();

    @ParameterizedTest
    @ValueSource(strings = {"password", "a", "é", "😀"})
    void passwordsWithin72BytesRemainCompatible(String character) {
        String password = character.equals("password") ? character
                : character.repeat(72 / character.getBytes(java.nio.charset.StandardCharsets.UTF_8).length);

        assertTrue(encoder.matches(password, standard.encode(password)));
        assertTrue(standard.matches(password, encoder.encode(password)));
        assertFalse(encoder.matches("wrong-password", standard.encode(password)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"a", "é", "😀"})
    void hundredCharacterPasswordsEncodeAndMatch(String character) {
        String password = character.repeat(100);

        assertTrue(encoder.matches(password, encoder.encode(password)));
    }

    @Test
    void differencesAfterByte72AreIgnored() {
        String prefix = "a".repeat(72);
        String first = prefix + "first";
        String second = prefix + "second";

        assertTrue(encoder.matches(first, encoder.encode(second)));
        assertTrue(encoder.matches(second, encoder.encode(first)));
    }

    @Test
    void truncationDoesNotSplitAnAccentedCharacter() {
        String prefix = "a".repeat(71);
        String password = prefix + "é" + "suffix";

        assertTrue(standard.matches(prefix, encoder.encode(password)));
        assertTrue(encoder.matches(password, standard.encode(prefix)));
        assertFalse(standard.matches(prefix + "?", encoder.encode(password)));
    }

    @Test
    void truncationDoesNotSplitASupplementaryCodePoint() {
        String prefix = "a".repeat(69);
        String password = prefix + "😀" + "suffix";

        assertTrue(standard.matches(prefix, encoder.encode(password)));
        assertTrue(encoder.matches(password, standard.encode(prefix)));
    }
}
