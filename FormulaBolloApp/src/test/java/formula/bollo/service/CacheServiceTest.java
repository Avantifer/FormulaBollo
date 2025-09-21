package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import formula.bollo.entity.Cache;
import formula.bollo.repository.CacheRepository;

@ExtendWith(MockitoExtension.class)
class CacheServiceTest {

    @InjectMocks
    private CacheService cacheService;

    @Mock
    private CacheRepository cacheRepository;

    @Test
    void getCurrentVersionEmpty() {
        when(cacheRepository.findById(anyString())).thenReturn(Optional.empty());

        Integer versionCache = cacheService.getCurrentVersion();

        assertEquals(0, versionCache);
    }

    @Test
    void getCurrentVersionGood() {
        Cache cache = new Cache("cache", 20);

        when(cacheRepository.findById(anyString())).thenReturn(Optional.of(cache));

        Integer versionCache = cacheService.getCurrentVersion();

        assertEquals(20, versionCache);
    }

    @Test
    void incrementVersionEmpty() {
        when(cacheRepository.findById(anyString())).thenReturn(Optional.empty());

        cacheService.incrementVersion();

        verify(cacheRepository, times(0)).save(any());
    }

    @Test
    void incrementVersionGood() {
        Cache cache = new Cache("cache", 20);

        when(cacheRepository.findById(anyString())).thenReturn(Optional.of(cache));

        cacheService.incrementVersion();

        verify(cacheRepository, times(1)).save(any());
    }
}
