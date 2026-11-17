package formula.bollo.service;

import org.springframework.cache.annotation.CacheEvict;
import formula.bollo.utils.Constants;

import java.util.Optional;

import org.springframework.stereotype.Service;

import formula.bollo.entity.Cache;
import formula.bollo.repository.CacheRepository;
import jakarta.transaction.Transactional;

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
        Optional<Cache> cache = cacheRepository.findById("general_cache");

        if (cache.isPresent()) {
            Cache cacheToSave = cache.get();
            Integer versionCache = cacheToSave.getVersion();

            cacheToSave.setVersion(versionCache + 1);

            cacheRepository.save(cacheToSave);
        }
    }
}
