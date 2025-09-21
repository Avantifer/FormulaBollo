package formula.bollo.config;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import formula.bollo.service.CacheService;
import lombok.extern.log4j.Log4j2;

import org.springframework.lang.NonNull;

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
      .setAllowedOrigins("*");
  }

  public static class CacheWebSocketHandler extends TextWebSocketHandler {
    private final CacheService cacheService;
    private Integer currentVersion;
    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();

    public CacheWebSocketHandler(CacheService cacheService) {
      this.cacheService = cacheService;
      this.currentVersion = cacheService.getCurrentVersion();
    }

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) throws Exception {
      // Agregamos la sesión al conjunto de sesiones
      sessions.add(session);

      try {
        session.sendMessage(new TextMessage(currentVersion.toString()));
      } catch (IOException e) {
        // Si ocurre un error al enviar, removemos la sesión y registramos el error
        sessions.remove(session);
        log.error("Error al enviar mensaje inicial: " + e.getMessage());
      }
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) throws Exception {
      // Removemos la sesión al cerrarse la conexión
      sessions.remove(session);
    }

    @Override
    public void handleTransportError(@NonNull WebSocketSession session, @NonNull Throwable exception) throws Exception {
      // Intentamos cerrar la sesión si ocurre un error de transporte
      if (session.isOpen()) {
        try {
          session.close(CloseStatus.SERVER_ERROR);
        } catch (IOException e) {
          log.error("Error al cerrar sesión: " + e.getMessage());
        }
      }

      sessions.remove(session);
      log.error("Error de transporte en la sesión: " + exception.getMessage());
    }

    @Override
    public void handleTextMessage(@NonNull WebSocketSession session, @NonNull TextMessage message) throws Exception {
      String response = message.getPayload();
      session.sendMessage(new TextMessage(response));
    }

    public void checkAndNotify() {
      Integer newVersion = cacheService.getCurrentVersion();

      if (!newVersion.equals(currentVersion)) {
        currentVersion = newVersion;
        TextMessage message = new TextMessage(newVersion.toString());

        sessions.forEach(session -> {
          if (session.isOpen()) {
            try {
              session.sendMessage(message);
            } catch (IOException e) {
              // Si falla el envío, removemos la sesión y registramos el error
              sessions.remove(session);
              log.error("Error al notificar a la sesión: " + e.getMessage());
            }
          }
        });
      }
    }
  }
}
