package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.util.ArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import formula.bollo.impl.DriverImpl;
import formula.bollo.impl.ResultImpl;
import formula.bollo.controller.StatisticsController;
import formula.bollo.config.WebSocketConfig;
import formula.bollo.repository.CacheRepository;
import formula.bollo.repository.DriverRepository;
import formula.bollo.repository.TeamRepository;
import formula.bollo.repository.RaceRepository;
import formula.bollo.repository.PenaltyRepository;
import formula.bollo.repository.ResultRepository;
import formula.bollo.repository.SprintRepository;
import formula.bollo.utils.Constants;

/**
 * Comprueba con el proxy de caché real de Spring que las estadísticas se sirven de la caché
 * y que escribir resultados la invalida (si no, la web enseñaría datos antiguos).
 */
@SpringJUnitConfig(StatsCacheTest.Config.class)
@Execution(ExecutionMode.SAME_THREAD)
class StatsCacheTest {

    @Configuration
    @EnableCaching
    static class Config {
        @Bean
        CacheManager cacheManager() {
            return new CaffeineCacheManager(Constants.CACHE_STATS);
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

        @Bean
        SynchronizedStats synchronizedStats() {
            return new SynchronizedStats();
        }

        @Bean
        StatisticsController statisticsController(ResultRepository results, SprintRepository sprints) {
            return new StatisticsController(new StatisticsService(mock(DriverRepository.class),
                    mock(TeamRepository.class), mock(RaceRepository.class), results, sprints,
                    mock(PenaltyRepository.class), mock(DriverService.class), mock(TeamService.class)));
        }

        @Bean
        CacheService cacheService() {
            return new CacheService(mock(CacheRepository.class));
        }

        @Bean
        CacheNotifier cacheNotifier(CacheService cacheService) {
            return new CacheNotifier(cacheService, mock(WebSocketConfig.CacheWebSocketHandler.class));
        }
    }

    static class SynchronizedStats {
        final AtomicInteger calls = new AtomicInteger();
        final CountDownLatch bodyEntered = new CountDownLatch(1);
        final CountDownLatch releaseBody = new CountDownLatch(1);

        @Cacheable(cacheNames = Constants.CACHE_STATS, sync = true, key = "#root.args[0]")
        public int load(String key) throws InterruptedException {
            calls.incrementAndGet();
            bodyEntered.countDown();
            if (!releaseBody.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Timed out waiting to release the cached computation");
            }
            return 42;
        }
    }

    @Autowired
    private ResultService resultService;

    @Autowired
    private ResultRepository resultRepository;

    @Autowired
    private SynchronizedStats synchronizedStats;

    @Autowired
    private StatisticsController statisticsController;

    @Autowired
    private CacheNotifier cacheNotifier;

    @Test
    void overviewIsCachedPerSeasonAndPublishingEvictsIt() {
        statisticsController.getOverview(1);
        statisticsController.getOverview(1);
        statisticsController.getOverview(2);
        verify(resultRepository, times(1)).findForStatistics(1);
        verify(resultRepository, times(1)).findForStatistics(2);

        cacheNotifier.publish();

        statisticsController.getOverview(1);
        statisticsController.getOverview(2);
        verify(resultRepository, times(2)).findForStatistics(1);
        verify(resultRepository, times(2)).findForStatistics(2);
    }

    @Test
    void headToHeadIsCachedPerSeasonAndPairAndPublishingEvictsIt() {
        cacheNotifier.publish();
        clearInvocations(resultRepository);
        statisticsController.getHeadToHead(31, "Ana", "Bea");
        statisticsController.getHeadToHead(31, "Ana", "Bea");
        statisticsController.getHeadToHead(31, "Bea", "Ana");
        statisticsController.getHeadToHead(32, "Ana", "Bea");
        verify(resultRepository, times(2)).findForStatistics(31);
        verify(resultRepository, times(1)).findForStatistics(32);

        cacheNotifier.publish();

        statisticsController.getHeadToHead(31, "Ana", "Bea");
        statisticsController.getHeadToHead(31, "Bea", "Ana");
        statisticsController.getHeadToHead(32, "Ana", "Bea");
        verify(resultRepository, times(4)).findForStatistics(31);
        verify(resultRepository, times(2)).findForStatistics(32);
    }

    @Test
    void headToHeadIsEvictedWhenResultsChange() {
        clearInvocations(resultRepository);
        statisticsController.getHeadToHead(33, "Ana", "Bea");
        statisticsController.getHeadToHead(33, "Ana", "Bea");
        verify(resultRepository, times(1)).findForStatistics(33);

        resultService.deleteResults(1);

        statisticsController.getHeadToHead(33, "Ana", "Bea");
        verify(resultRepository, times(2)).findForStatistics(33);
    }

    @Test
    void statsAreCachedAndEvictedWhenResultsChange() {
        resultService.getTotalResultsPerDriver(2, null);
        resultService.getTotalResultsPerDriver(2, null);
        verify(resultRepository, times(1)).findBySeason(2);

        resultService.deleteResults(1);

        resultService.getTotalResultsPerDriver(2, null);
        verify(resultRepository, times(2)).findBySeason(2);
    }

    @Test
    void eightConcurrentRequestsForTheSameKeyComputeOnlyOnce() throws Exception {
        CountDownLatch ready = new CountDownLatch(8);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch calling = new CountDownLatch(8);
        // Inspect state on the target bean: fields on the CGLIB proxy are not the target's fields.
        SynchronizedStats target = org.springframework.test.util.AopTestUtils.getTargetObject(synchronizedStats);
        try (var executor = Executors.newFixedThreadPool(8)) {
            var futures = new ArrayList<Future<Integer>>();
            try {
                for (int i = 0; i < 8; i++) {
                    futures.add(executor.submit(() -> {
                        ready.countDown();
                        assertTrue(start.await(5, TimeUnit.SECONDS));
                        calling.countDown();
                        return synchronizedStats.load("concurrent-stats");
                    }));
                }
                assertTrue(ready.await(5, TimeUnit.SECONDS));
                start.countDown();
                assertTrue(calling.await(5, TimeUnit.SECONDS));
                assertTrue(target.bodyEntered.await(5, TimeUnit.SECONDS));
            } finally {
                start.countDown();
                target.releaseBody.countDown();
            }
            for (Future<Integer> future : futures) {
                assertEquals(42, future.get(5, TimeUnit.SECONDS));
            }
            assertEquals(1, target.calls.get());
        }
    }
}
