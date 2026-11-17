package formula.bollo.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.config.annotation.ServletWebSocketHandlerRegistry;
import org.springframework.web.socket.server.support.OriginHandshakeInterceptor;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.server.ServletServerHttpResponse;

import formula.bollo.config.WebSocketConfig.CacheWebSocketHandler;
import formula.bollo.service.CacheService;

class WebSocketConfigTest {
    private final CacheService cache = mock(CacheService.class);

    private WebSocketSession session(String id) {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn(id);
        when(session.isOpen()).thenReturn(true);
        return session;
    }

    @Test
    void textMessagesAreIgnored() throws Exception {
        when(cache.getCurrentVersion()).thenReturn(1);
        var handler = new CacheWebSocketHandler(cache);
        var session = session("client");
        handler.afterConnectionEstablished(session);
        clearInvocations(session);
        handler.handleMessage(session, new TextMessage("client-input"));
        verify(session, never()).sendMessage(any());
    }

    @Test
    void rejectsThe501stSessionAndFreesClosedSlots() throws Exception {
        when(cache.getCurrentVersion()).thenReturn(1);
        var handler = new CacheWebSocketHandler(cache);
        var first = session("0");
        handler.afterConnectionEstablished(first);
        for (int i = 1; i < 500; i++) handler.afterConnectionEstablished(session("" + i));
        var excess = session("excess");
        handler.afterConnectionEstablished(excess);
        verify(excess).close(CloseStatus.SERVICE_OVERLOAD);
        verify(excess, never()).sendMessage(any());
        handler.afterConnectionClosed(first, CloseStatus.NORMAL);
        var replacement = session("replacement");
        handler.afterConnectionEstablished(replacement);
        verify(replacement).sendMessage(new TextMessage("1"));
        verify(replacement, never()).close(any());
    }

    @Test
    void initialAndBroadcastMessagesNeverWriteToTheSessionConcurrently() throws Exception {
        AtomicInteger version = new AtomicInteger(1);
        when(cache.getCurrentVersion()).thenAnswer(i -> version.get());
        var handler = new CacheWebSocketHandler(cache);
        var session = session("slow");
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var writing = new AtomicBoolean();
        List<String> received = new java.util.concurrent.CopyOnWriteArrayList<>();
        doAnswer(invocation -> {
            assertTrue(writing.compareAndSet(false, true), "Concurrent session write");
            try {
                TextMessage message = invocation.getArgument(0);
                if (message.getPayload().equals("1")) {
                    entered.countDown();
                    assertTrue(release.await(5, TimeUnit.SECONDS));
                }
                received.add(message.getPayload());
            } finally { writing.set(false); }
            return null;
        }).when(session).sendMessage(any());
        try (var executor = Executors.newFixedThreadPool(2)) {
            var initial = executor.submit(() -> { handler.afterConnectionEstablished(session); return null; });
            try {
                assertTrue(entered.await(5, TimeUnit.SECONDS));
                version.set(2);
                var broadcast = executor.submit(handler::checkAndNotify);
                broadcast.get(5, TimeUnit.SECONDS);
            } finally { release.countDown(); }
            initial.get(5, TimeUnit.SECONDS);
        }
        assertEquals(List.of("1", "2"), received);
    }

    @Test
    void concurrentChecksBroadcastEachVersionOnlyOnce() throws Exception {
        AtomicInteger version = new AtomicInteger(1);
        when(cache.getCurrentVersion()).thenAnswer(i -> version.get());
        var handler = new CacheWebSocketHandler(cache);
        var session = session("client");
        handler.afterConnectionEstablished(session);
        version.set(2);
        try (var executor = Executors.newFixedThreadPool(8)) {
            var start = new CountDownLatch(1);
            var tasks = new ArrayList<java.util.concurrent.Future<?>>();
            for (int i = 0; i < 16; i++) tasks.add(executor.submit(() -> {
                assertTrue(start.await(5, TimeUnit.SECONDS));
                handler.checkAndNotify();
                return null;
            }));
            start.countDown();
            for (var task : tasks) task.get(5, TimeUnit.SECONDS);
        }
        verify(session, times(1)).sendMessage(new TextMessage("2"));
    }

    @Test
    void acceptsOnlyFrontendOriginsWithoutTrailingSlashes() throws Exception {
        var registry = new ServletWebSocketHandlerRegistry();
        new WebSocketConfig(cache).registerWebSocketHandlers(registry);
        // Use the actual registered handshake, so Spring's origin normalization is exercised.
        var mapping = registry.getHandlerMapping();
        mapping.setPatternParser(null);
        // Sin contexto el mapeo no registra las URLs y getHandler devuelve null.
        mapping.setApplicationContext(new org.springframework.context.support.StaticApplicationContext());
        for (String origin : List.of("https://formulabollo.es", "http://localhost:4200", "https://evil.example")) {
            var request = new MockHttpServletRequest("GET", "/ws/cache-version");
            request.addHeader("Origin", origin);
            var chain = mapping.getHandler(request);
            var httpHandler = (org.springframework.web.socket.server.support.WebSocketHttpRequestHandler) chain.getHandler();
            var interceptor = (OriginHandshakeInterceptor) httpHandler.getHandshakeInterceptors().stream()
                    .filter(OriginHandshakeInterceptor.class::isInstance).findFirst().orElseThrow();
            assertEquals(!origin.equals("https://evil.example"), interceptor.beforeHandshake(
                    new ServletServerHttpRequest(request), new ServletServerHttpResponse(new MockHttpServletResponse()),
                    httpHandler.getWebSocketHandler(), new java.util.HashMap<>()));
        }
    }
}
