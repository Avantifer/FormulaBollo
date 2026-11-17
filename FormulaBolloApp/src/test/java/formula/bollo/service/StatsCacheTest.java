package formula.bollo.service;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import formula.bollo.impl.DriverImpl;
import formula.bollo.impl.ResultImpl;
import formula.bollo.repository.ResultRepository;
import formula.bollo.repository.SprintRepository;
import formula.bollo.utils.Constants;

/**
 * Comprueba con el proxy de caché real de Spring que las estadísticas se sirven de la caché
 * y que escribir resultados la invalida (si no, la web enseñaría datos antiguos).
 */
@SpringJUnitConfig(StatsCacheTest.Config.class)
class StatsCacheTest {

    @Configuration
    @EnableCaching
    static class Config {
        @Bean
        CacheManager cacheManager() {
            return new ConcurrentMapCacheManager(Constants.CACHE_STATS);
        }

        @Bean
        ResultRepository resultRepository() {
            return mock(ResultRepository.class);
        }

        @Bean
        SprintRepository sprintRepository() {
            return mock(SprintRepository.class);
        }

        @Bean
        ResultService resultService(ResultRepository results, SprintRepository sprints) {
            return new ResultService(results, sprints, mock(ResultImpl.class), mock(DriverImpl.class));
        }
    }

    @Autowired
    private ResultService resultService;

    @Autowired
    private ResultRepository resultRepository;

    @Test
    void statsAreCachedAndEvictedWhenResultsChange() {
        resultService.getTotalResultsPerDriver(2, null);
        resultService.getTotalResultsPerDriver(2, null);
        verify(resultRepository, times(1)).findBySeason(2);

        resultService.deleteResults(1);

        resultService.getTotalResultsPerDriver(2, null);
        verify(resultRepository, times(2)).findBySeason(2);
    }
}
