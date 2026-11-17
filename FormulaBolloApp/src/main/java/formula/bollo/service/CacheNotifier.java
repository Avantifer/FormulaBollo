package formula.bollo.service;

import org.springframework.stereotype.Service;

import formula.bollo.config.WebSocketConfig;

/**
 * Publica una nueva versión de la caché de los clientes: la sube en la base de datos y avisa por
 * WebSocket a los navegadores conectados para que vacíen su caché local.
 */
@Service
public class CacheNotifier {

    private final CacheService cacheService;
    private final WebSocketConfig.CacheWebSocketHandler cacheWebSocketHandler;

    public CacheNotifier(CacheService cacheService, WebSocketConfig.CacheWebSocketHandler cacheWebSocketHandler) {
        this.cacheService = cacheService;
        this.cacheWebSocketHandler = cacheWebSocketHandler;
    }

    public void publish() {
        cacheService.incrementVersion();
        cacheWebSocketHandler.checkAndNotify();
    }
}
