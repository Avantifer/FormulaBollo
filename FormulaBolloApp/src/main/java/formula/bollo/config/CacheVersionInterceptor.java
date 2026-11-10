package formula.bollo.config;

import java.util.Set;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import formula.bollo.service.CacheNotifier;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

/**
 * Tras un guardado correcto (2xx) sube la versión de la caché de los clientes, para que los demás
 * navegadores vean los datos nuevos. Las rutas concretas se registran en {@link CacheVersionWebConfig}.
 * Un guardado fallido no publica nada, y un fallo al publicar nunca afecta a la respuesta ya enviada.
 */
@Slf4j
@Component
public class CacheVersionInterceptor implements HandlerInterceptor {

    // OPTIONS (preflight de CORS) y GET no modifican datos.
    private static final Set<String> WRITE_METHODS = Set.of("POST", "PUT", "DELETE");

    private final CacheNotifier cacheNotifier;

    public CacheVersionInterceptor(CacheNotifier cacheNotifier) {
        this.cacheNotifier = cacheNotifier;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler,
            Exception ex) {
        int status = response.getStatus();
        if (ex != null || !WRITE_METHODS.contains(request.getMethod()) || status < 200 || status >= 300) {
            return;
        }

        try {
            cacheNotifier.publish();
        } catch (RuntimeException e) {
            log.error("No se pudo publicar la nueva versión de la caché tras " + request.getMethod() + " "
                    + request.getRequestURI(), e);
        }
    }
}
