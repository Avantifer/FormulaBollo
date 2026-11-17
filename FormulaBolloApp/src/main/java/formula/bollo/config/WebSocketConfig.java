package formula.bollo.config;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

import formula.bollo.service.CacheService;
import formula.bollo.utils.Constants;
import lombok.extern.log4j.Log4j2;

import org.jspecify.annotations.NonNull;

@Configuration
@Log4j2
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

  private final CacheService cacheService;
  
  public WebSocketConfig(CacheService cacheService) {
    this.cacheService = cacheService;
  }

  @Bean
  CacheWebSocketHandler cacheWebSocketHandler() {
    return new CacheWebSocketHandler(cacheService);
  }

  @Override
  public void registerWebSocketHandlers(@NonNull WebSocketHandlerRegistry registry) {
    registry.addHandler(cacheWebSocketHandler(), "/ws/cache-version")
      .setAllowedOrigins(Constants.PRODUCTION_FRONTEND.replaceAll("/+$", ""),
          Constants.LOCAL_FRONTEND.replaceAll("/+$", ""));
  }

  public static class CacheWebSocketHandler extends TextWebSocketHandler {
    private final CacheService cacheService;
    private static final int MAX_SESSIONS = 500;
    private static final int SEND_TIME_LIMIT_MS = 10_000;
    private static final int BUFFER_SIZE_LIMIT_BYTES = 64 * 1024;
    private Integer currentVersion;
    private final Map<String, ClientSession> sessions = new ConcurrentHashMap<>();
    private final ReentrantLock notificationLock = new ReentrantLock();

    public CacheWebSocketHandler(CacheService cacheService) {
      this.cacheService = cacheService;
      this.currentVersion = cacheService.getCurrentVersion();
    }

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) throws Exception {
      ClientSession client = new ClientSession(session);
      Integer initialVersion;
      boolean accepted;
      notificationLock.lock();
      try {
        sessions.values().removeIf(existing -> !existing.session.isOpen());
        accepted = sessions.size() < MAX_SESSIONS;
        initialVersion = currentVersion;
        if (accepted) {
          sessions.put(session.getId(), client);
        }
      } finally {
        notificationLock.unlock();
      }
      if (!accepted) {
        session.close(CloseStatus.SERVICE_OVERLOAD);
        return;
      }

      // El envío inicial no retiene el cerrojo mientras el cliente recibe datos.
      if (!sendVersion(client, initialVersion)) {
        return;
      }
      notificationLock.lock();
      try {
        if (sessions.get(session.getId()) == client) {
          client.initialized = true;
          // Recupera cualquier cambio que llegase durante el envío inicial.
          if (!initialVersion.equals(currentVersion)) {
            sendVersion(client, currentVersion);
          }
        }
      } finally {
        notificationLock.unlock();
      }
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) throws Exception {
      sessions.remove(session.getId());
    }

    @Override
    public void handleTransportError(@NonNull WebSocketSession session, @NonNull Throwable exception) throws Exception {
      sessions.remove(session.getId());
      if (session.isOpen()) {
        try {
          session.close(CloseStatus.SERVER_ERROR);
        } catch (IOException e) {
          log.error("Error al cerrar sesión: " + e.getMessage());
        }
      }

      log.error("Error de transporte en la sesión: " + exception.getMessage());
    }

    public void checkAndNotify() {
      notificationLock.lock();
      try {
        sessions.values().removeIf(client -> !client.session.isOpen());
        Integer newVersion = cacheService.getCurrentVersion();
        if (!newVersion.equals(currentVersion)) {
          currentVersion = newVersion;
          sessions.values().forEach(client -> {
            if (client.initialized) {
              sendVersion(client, newVersion);
            }
          });
        }
      } finally {
        notificationLock.unlock();
      }
    }

    private boolean sendVersion(ClientSession client, Integer version) {
      try {
        client.session.sendMessage(new TextMessage(version.toString()));
        return true;
      } catch (IOException | IllegalStateException e) {
        sessions.remove(client.session.getId(), client);
        log.error("Error al notificar a la sesión: " + e.getMessage());
        try {
          client.session.close(CloseStatus.SERVER_ERROR);
        } catch (IOException closeException) {
          log.error("Error al cerrar sesión: " + closeException.getMessage());
        }
        return false;
      }
    }

    private static class ClientSession {
      private final ConcurrentWebSocketSessionDecorator session;
      private boolean initialized;

      private ClientSession(WebSocketSession session) {
        this.session = new ConcurrentWebSocketSessionDecorator(session, SEND_TIME_LIMIT_MS, BUFFER_SIZE_LIMIT_BYTES);
      }
    }
  }
}
