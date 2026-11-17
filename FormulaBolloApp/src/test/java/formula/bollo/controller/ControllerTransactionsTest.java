package formula.bollo.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import org.hibernate.LazyInitializationException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.mapstruct.factory.Mappers;
import org.springframework.aop.framework.Advised;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.cache.interceptor.CacheInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import formula.bollo.config.CacheConfig;
import formula.bollo.entity.Driver;
import formula.bollo.entity.Position;
import formula.bollo.entity.Race;
import formula.bollo.entity.Result;
import formula.bollo.entity.Season;
import formula.bollo.entity.Team;
import formula.bollo.impl.DriverImpl;
import formula.bollo.impl.FantasyPointsImpl;
import formula.bollo.impl.FantasyPriceImpl;
import formula.bollo.impl.ResultImpl;
import formula.bollo.mapper.DriverMapper;
import formula.bollo.model.DriverDTO;
import formula.bollo.model.FantasyPointsAccountDTO;
import formula.bollo.repository.DriverRepository;
import formula.bollo.repository.FantasyPointsDriverRepository;
import formula.bollo.repository.FantasyPointsTeamRepository;
import formula.bollo.repository.FantasyPriceDriverRepository;
import formula.bollo.repository.FantasyPriceTeamRepository;
import formula.bollo.service.DriverService;
import formula.bollo.service.FantasyService;
import formula.bollo.service.ResultService;
import formula.bollo.utils.Constants;
import jakarta.persistence.EntityManager;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:controller-transactions;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.open-in-view=false",
        "spring.sql.init.mode=never"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Execution(ExecutionMode.SAME_THREAD) // comparten la BD H2 y cada test siembra y limpia las mismas filas
@Import({ DriverController.class, DriverImpl.class, ResultService.class, CacheConfig.class,
        ControllerTransactionsTest.Config.class })
class ControllerTransactionsTest {
    @Autowired EntityManager em;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired DriverRepository drivers;
    @Autowired DriverImpl driverImpl;
    @Autowired DriverController driverController;
    @Autowired ResultService resultService;
    @Autowired FantasyController fantasyController;
    @Autowired FantasyService fantasyService;
    @Autowired CacheManager cacheManager;

    Long driverId;

    @BeforeEach
    void seed() {
        cacheManager.getCache(Constants.CACHE_STATS).clear();
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            Season season = new Season(null, "Season 2", 2, 2026);
            em.persist(season);
            Team team = new Team(null, "Bollo", null, null, season);
            em.persist(team);
            Driver driver = new Driver(null, "Ana", 1, null, season, team);
            em.persist(driver);
            driverId = driver.getId();
            Race race = new Race(null, "Race", "flag.png", "circuit.png",
                    LocalDateTime.of(2026, 3, 1, 12, 0), season, 1);
            em.persist(race);
            Position position = new Position(null, 1, 25);
            em.persist(position);
            em.persist(new Result(null, race, driver, position, 1, 1));
        });
    }

    @AfterEach
    void cleanUp() {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            for (String entity : List.of("Result", "Position", "Race", "Driver", "Team", "Season")) {
                em.createQuery("delete from " + entity).executeUpdate();
            }
        });
    }

    @Test
    void getMapsLazyRelationsInsideItsReadTransactionWithoutOpenInView() {
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
        Driver detached = new TransactionTemplate(transactionManager)
                .execute(status -> drivers.findById(driverId).orElseThrow());
        assertThatThrownBy(() -> driverImpl.driverToDriverDTO(detached))
                .isInstanceOf(LazyInitializationException.class);

        List<DriverDTO> response = driverController.getAllDrivers(2);

        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
        assertThat(response).singleElement().satisfies(driver -> {
            assertThat(driver.getName()).isEqualTo("Ana");
            assertThat(driver.getTeam().getName()).isEqualTo("Bollo");
            assertThat(driver.getTeam().getSeason().getNumber()).isEqualTo(2);
        });
    }

    @Test
    void postReadingSpecificDriverResultsMapsLazyRelationsInsideServiceTransaction() {
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();

        assertThat(resultService.getTotalResultsSpecificPerDriver(2, List.of(driverId)))
                .singleElement().satisfies(points -> {
                    assertThat(points.getTotalPoints()).isEqualTo(26);
                    assertThat(points.getDriver().getTeam().getName()).isEqualTo("Bollo");
                });

        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
    }

    @Test
    void fantasySeasonCacheStillCachesWithTheTransactionAdvisorEnabled() {
        var advice = Arrays.stream(((Advised) fantasyController).getAdvisors())
                .map(advisor -> advisor.getAdvice()).toList();
        assertThat(advice).anyMatch(CacheInterceptor.class::isInstance)
                .anyMatch(TransactionInterceptor.class::isInstance);
        System.out.println("FantasyController advisor order: "
                + advice.stream().map(item -> item.getClass().getSimpleName()).toList());
        List<FantasyPointsAccountDTO> expected = List.of(new FantasyPointsAccountDTO());
        when(fantasyService.sumAllFantasyPoints(2)).thenAnswer(invocation -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
            assertThat(TransactionSynchronizationManager.isCurrentTransactionReadOnly()).isTrue();
            return expected;
        });

        assertThat(fantasyController.getFantasyPointsSeason(2)).isSameAs(expected);
        assertThat(fantasyController.getFantasyPointsSeason(2)).isSameAs(expected);

        verify(fantasyService, times(1)).sumAllFantasyPoints(2);
        assertThat(cacheManager.getCache(Constants.CACHE_STATS).get("fantasyPointsSeason:2").get())
                .isSameAs(expected);
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
    }

    @TestConfiguration
    static class Config {
        @Bean
        DriverMapper driverMapper() {
            return Mappers.getMapper(DriverMapper.class);
        }

        @Bean
        DriverService driverService() {
            return mock(DriverService.class);
        }

        @Bean
        ResultImpl resultImpl() {
            return mock(ResultImpl.class);
        }

        @Bean
        FantasyService fantasyService() {
            return mock(FantasyService.class);
        }

        @Bean
        CacheManager cacheManager() {
            return new ConcurrentMapCacheManager(Constants.CACHE_STATS);
        }

        @Bean
        FantasyController fantasyController(FantasyPointsDriverRepository driverPoints,
                FantasyPriceDriverRepository driverPrices, FantasyPriceTeamRepository teamPrices,
                FantasyPointsTeamRepository teamPoints, FantasyService service) {
            return new FantasyController(driverPoints, driverPrices, teamPrices, teamPoints,
                    mock(FantasyPriceImpl.class), mock(FantasyPointsImpl.class), service);
        }
    }
}
