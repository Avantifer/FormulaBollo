package formula.bollo.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import formula.bollo.service.CacheNotifier;

@ExtendWith(MockitoExtension.class)
class CacheVersionInterceptorTest {

    @InjectMocks
    private CacheVersionInterceptor interceptor;

    @Mock
    private CacheNotifier cacheNotifier;

    private void complete(String method, int status, Exception error) {
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(status);
        interceptor.afterCompletion(new MockHttpServletRequest(method, "/results/save"), response, new Object(), error);
    }

    @ParameterizedTest
    @CsvSource({ "PUT,200", "DELETE,200", "POST,201" })
    void publishesAfterASuccessfulWrite(String method, int status) {
        complete(method, status, null);

        verify(cacheNotifier).publish();
    }

    @ParameterizedTest
    @CsvSource({ "PUT,500", "PUT,403", "DELETE,400", "POST,302" })
    void doesNotPublishWhenTheWriteFailed(String method, int status) {
        complete(method, status, null);

        verifyNoInteractions(cacheNotifier);
    }

    @ParameterizedTest
    @CsvSource({ "GET,200", "OPTIONS,200", "HEAD,200" })
    void doesNotPublishForRequestsThatDoNotModifyData(String method, int status) {
        complete(method, status, null);

        verifyNoInteractions(cacheNotifier);
    }

    @Test
    void doesNotPublishWhenTheHandlerThrew() {
        complete("PUT", 200, new IllegalStateException("fallo"));

        verifyNoInteractions(cacheNotifier);
    }

    @Test
    void aFailurePublishingNeverBreaksTheResponse() {
        doThrow(new IllegalStateException("base de datos caída")).when(cacheNotifier).publish();

        assertDoesNotThrow(() -> complete("PUT", 200, null));
    }
}
