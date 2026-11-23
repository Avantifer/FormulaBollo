package formula.bollo.config;

import java.nio.charset.StandardCharsets;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

// BCrypt solo usa 72 bytes y Spring Security 7 lanza una excepción si se superan.
public class TruncatingBCryptPasswordEncoder extends BCryptPasswordEncoder {
    @Override
    protected String encodeNonNullPassword(String rawPassword) {
        return super.encodeNonNullPassword(truncate(rawPassword));
    }

    @Override
    protected boolean matchesNonNull(String rawPassword, String encodedPassword) {
        return super.matchesNonNull(truncate(rawPassword), encodedPassword);
    }

    private String truncate(String password) {
        int end = 0;
        int bytes = 0;
        while (end < password.length()) {
            int next = end + Character.charCount(password.codePointAt(end));
            int length = password.substring(end, next).getBytes(StandardCharsets.UTF_8).length;
            if (bytes + length > 72) {
                break;
            }
            bytes += length;
            end = next;
        }
        return password.substring(0, end);
    }
}
