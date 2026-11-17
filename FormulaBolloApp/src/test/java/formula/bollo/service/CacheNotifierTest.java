package formula.bollo.service;

import static org.mockito.Mockito.inOrder;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import formula.bollo.config.WebSocketConfig;

@ExtendWith(MockitoExtension.class)
class CacheNotifierTest {

    @InjectMocks
    private CacheNotifier cacheNotifier;

    @Mock
    private CacheService cacheService;

    @Mock
    private WebSocketConfig.CacheWebSocketHandler cacheWebSocketHandler;

    @Test
    void publishRaisesTheVersionBeforeNotifyingTheBrowsers() {
        cacheNotifier.publish();

        // Primero se sube la versión: si no, los navegadores recibirían la versión antigua.
        InOrder order = inOrder(cacheService, cacheWebSocketHandler);
        order.verify(cacheService).incrementVersion();
        order.verify(cacheWebSocketHandler).checkAndNotify();
    }
}
