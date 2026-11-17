package formula.bollo.service;

import org.springframework.cache.annotation.CacheEvict;
import formula.bollo.utils.Constants;

import java.util.Optional;

import org.springframework.stereotype.Service;

import formula.bollo.entity.Cache;
import formula.bollo.repository.CacheRepository;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class CacheService {

    private final CacheRepository cacheRepository;

    public CacheService(CacheRepository cacheRepository) {
        this.cacheRepository = cacheRepository;
    }

    public Integer getCurrentVersion() {
        Optional<Cache> cache = cacheRepository.findById("general_cache");
        Integer versionCache = 0;

        if (cache.isPresent()) {
            versionCache = cache.get().getVersion();
        }

        return versionCache;
    }

    @Transactional
    @CacheEvict(cacheNames = Constants.CACHE_STATS, allEntries = true)
    public void incrementVersion() {
        if (cacheRepository.incrementVersion("general_cache") == 0) {
            log.warn("No existe general_cache; se crea con version 1");
            cacheRepository.save(new Cache("general_cache", 1));
        }
    }
}
