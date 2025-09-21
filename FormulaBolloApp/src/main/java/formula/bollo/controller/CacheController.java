package formula.bollo.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import formula.bollo.config.WebSocketConfig;
import formula.bollo.service.CacheService;
import formula.bollo.utils.Constants;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.transaction.Transactional;


@RestController
@RequestMapping(path = {Constants.ENDPOINT_CACHE})
@Tag(name = Constants.TAG_CACHE, description = Constants.TAG_CACHE_SUMMARY)
public class CacheController {
    private final CacheService cacheService;
    private final WebSocketConfig.CacheWebSocketHandler cacheWebSocketHandler;

    public CacheController(CacheService cacheService, WebSocketConfig.CacheWebSocketHandler cacheWebSocketHandler) {
        this.cacheWebSocketHandler = cacheWebSocketHandler;
        this.cacheService = cacheService;
    }

    @Operation(summary = "Get current cache version", tags = Constants.TAG_CACHE)
    @GetMapping("/current")
    public Integer getCurrentVersion() {
        return cacheService.getCurrentVersion();
    }

    @Operation(summary = "Update cache version", tags = Constants.TAG_CACHE)
    @PostMapping("/update")
    @Transactional
    public ResponseEntity<Void> updateCache() {
        cacheService.incrementVersion();
        cacheWebSocketHandler.checkAndNotify();
        return ResponseEntity.ok().build();
    }
}
