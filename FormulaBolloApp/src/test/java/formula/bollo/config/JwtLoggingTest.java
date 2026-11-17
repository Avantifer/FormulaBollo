package formula.bollo.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.userdetails.UserDetailsService;

import jakarta.servlet.FilterChain;

@ExtendWith(OutputCaptureExtension.class)
class JwtLoggingTest {
    @Test
    void invalidTokenDoesNotExposeExceptionContents(CapturedOutput output) throws Exception {
        JwtConfig jwt = mock(JwtConfig.class);
        when(jwt.extractUsername("recovery-secret-token"))
                .thenThrow(new IllegalArgumentException("private@example.com recovery-secret-token"));
        JwtRequestFilter filter = new JwtRequestFilter(mock(UserDetailsService.class), jwt);
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);
        request.addHeader("Authorization", "Bearer recovery-secret-token");
        filter.doFilter(request, response, chain);
        verify(chain).doFilter(request, response);
        assertFalse(output.getAll().contains("private@example.com"));
        assertFalse(output.getAll().contains("recovery-secret-token"));
    }
}
