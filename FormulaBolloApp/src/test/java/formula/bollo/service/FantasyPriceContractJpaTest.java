package formula.bollo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Isolated;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mapstruct.factory.Mappers;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.test.web.servlet.setup.StandaloneMockMvcBuilder;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.handler.MappedInterceptor;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import formula.bollo.config.ResponseStatusExceptionHandler;
import formula.bollo.config.CacheVersionInterceptor;
import formula.bollo.config.CacheVersionWebConfig;
import formula.bollo.config.WebSocketConfig.CacheWebSocketHandler;
import formula.bollo.controller.FantasyController;
import formula.bollo.entity.*;
import formula.bollo.impl.*;
import formula.bollo.mapper.*;
import formula.bollo.repository.*;
import formula.bollo.utils.Constants;
import jakarta.persistence.EntityManager;

/** Real repositories and proxied writes; new API is deliberately exercised only over HTTP. */
@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:fantasy-price-contract;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa",
        "spring.datasource.password=", "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.sql.init.mode=never"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({FantasyController.class, FantasyService.class, CacheService.class, CacheNotifier.class,
        CacheVersionInterceptor.class, CacheVersionWebConfig.class,
        FantasyPriceContractJpaTest.Config.class})
@Isolated
class FantasyPriceContractJpaTest {
    @TestConfiguration
    @EnableCaching
    static class Config {
        @Bean Clock clock() { return Clock.fixed(Instant.parse("2025-01-01T00:00:00Z"), ZoneOffset.UTC); }
        @Bean CacheManager cacheManager() { return new ConcurrentMapCacheManager(Constants.CACHE_STATS); }
        @Bean CacheWebSocketHandler socket() { return mock(CacheWebSocketHandler.class); }
        @Bean FantasyElectionImpl electionMapper() { return new FantasyElectionImpl(Mappers.getMapper(FantasyElectionMapper.class)); }
        @Bean FantasyPriceImpl priceMapper() { return new FantasyPriceImpl(Mappers.getMapper(FantasyPriceMapper.class)); }
        @Bean FantasyPointsImpl pointsMapper() { return new FantasyPointsImpl(Mappers.getMapper(FantasyPointsMapper.class)); }
        @Bean AccountImpl accountMapper() { return new AccountImpl(Mappers.getMapper(AccountMapper.class)); }
        @Bean DriverImpl driverMapper() { return new DriverImpl(Mappers.getMapper(DriverMapper.class)); }
        @Bean TeamImpl teamMapper() { return new TeamImpl(Mappers.getMapper(TeamMapper.class)); }
    }

    @Autowired EntityManager em;
    @Autowired FantasyController controller;
    @Autowired FantasyService service;
    @Autowired FantasyPriceDriverRepository driverPrices;
    @Autowired FantasyPriceTeamRepository teamPrices;
    @Autowired FantasyPointsDriverRepository driverPoints;
    @Autowired FantasyPointsTeamRepository teamPoints;
    @Autowired ResultRepository resultsRepository;
    @Autowired CacheService cacheService;
    @Autowired CacheManager cacheManager;
    @Autowired CacheWebSocketHandler socket;
    @Autowired DriverImpl driverMapper;
    @Autowired TeamImpl teamMapper;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired CacheVersionWebConfig publicationConfig;

    MockMvc mvc;
    Season season;
    Race race;
    Race next;
    Race earlierTie;
    Driver ana;
    Driver bea;
    Driver absent;
    Team team;
    Team otherTeam;

    @BeforeEach
    void seed() {
        var builder = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new ResponseStatusExceptionHandler());
        var registry = new HttpInterceptors();
        publicationConfig.addInterceptors(registry);
        registry.applyTo(builder);
        mvc = builder.build();
        season = persist(new Season(null, "Current", Constants.ACTUAL_SEASON, 2026));
        team = persist(new Team(null, "Red", "", "", season));
        otherTeam = persist(new Team(null, "Blue", "", "", season));
        ana = persist(new Driver(null, "Ana", 1, "", season, team));
        bea = persist(new Driver(null, "Bea", 2, "", season, team));
        absent = persist(new Driver(null, "Absent", 3, "", season, otherTeam));
        earlierTie = race(season, "Earlier id on target date", LocalDateTime.of(2026, 5, 10, 12, 0));
        race = race(season, "GP Contract", earlierTie.getDateStart());
        next = race(season, "Next GP", race.getDateStart().plusDays(7));
        persist(new Result(null, race, ana, persist(new Position(null, 1, 25)), 0, 0));
        persist(new Result(null, race, bea, persist(new Position(null, 2, 18)), 0, 0));
        persist(new FantasyPriceDriver(null, bea, race, 25_000_000));
        persist(new FantasyPriceDriver(null, absent, race, 8_000_000));
        persist(new FantasyPriceTeam(null, otherTeam, race, 7_000_000));
        persist(new Cache("general_cache", 41));
        em.flush();
        cacheManager.getCache(Constants.CACHE_STATS).clear();
        reset(socket);
    }

    @ParameterizedTest
    @ValueSource(strings = {"stored", "calendar", "date-tie", "target-date-tie", "previous-season", "skip-empty-season"})
    void pointsUseEffectiveDriverPrice(String history) throws Exception {
        history(history);
        mvc.perform(post("/fantasy/saveDriverTeamPoints").param("raceId", id(race)))
                .andExpect(status().isOk());
        em.flush();
        em.clear();
        // A winner with a 6M effective price and two classified drivers earns ceil((10 + 8) * 1.2).
        assertThat(driverPoints.findByRaceId(race.getId().intValue()))
                .filteredOn(row -> row.getDriver().getId().equals(ana.getId()))
                .singleElement().extracting(FantasyPointsDriver::getPoints).isEqualTo(22);
    }

    @ParameterizedTest
    @ValueSource(strings = {"stored", "calendar", "date-tie", "target-date-tie", "previous-season", "skip-empty-season"})
    void pricesUseEffectiveDriverPrice(String history) throws Exception {
        history(history);
        points();
        mvc.perform(post("/fantasy/saveDriverTeamPrices").param("raceId", id(race)))
                .andExpect(status().isOk());
        em.flush();
        em.clear();
        assertThat(driverPrices.findByRaceId(next.getId().intValue()))
                .filteredOn(row -> row.getDriver().getId().equals(ana.getId()))
                .singleElement().extracting(FantasyPriceDriver::getPrice).isEqualTo(8_000_000);
    }

    @ParameterizedTest
    @ValueSource(strings = {"stored", "calendar", "date-tie", "target-date-tie", "previous-season", "skip-empty-season"})
    void adminReadUsesTheSameEffectiveHistoryForDriversAndTeams(String history) throws Exception {
        history(history);
        // Contract field names: storedPrice and suggestedPrice, in money units.
        mvc.perform(get("/fantasy/adminPrices").param("raceId", id(race)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.drivers.length()").value(3))
                .andExpect(jsonPath("$.teams.length()").value(2))
                .andExpect(jsonPath("$.drivers[?(@.id == " + ana.getId() + ")].name").value("Ana"))
                .andExpect(jsonPath("$.drivers[?(@.id == " + ana.getId() + ")].suggestedPrice").value(6_000_000))
                .andExpect(jsonPath("$.teams[?(@.id == " + team.getId() + ")].name").value("Red"))
                .andExpect(jsonPath("$.teams[?(@.id == " + team.getId() + ")].suggestedPrice").value(6_000_000))
                .andExpect(jsonPath("$.drivers[?(@.id == " + ana.getId() + ")].storedPrice")
                        .value(org.hamcrest.Matchers.equalTo(history.equals("stored") ? List.of(6_000_000) : java.util.Collections.singletonList(null)), List.class))
                .andExpect(jsonPath("$.teams[?(@.id == " + team.getId() + ")].storedPrice")
                        .value(org.hamcrest.Matchers.equalTo(history.equals("stored") ? List.of(6_000_000) : java.util.Collections.singletonList(null)), List.class));
    }

    @Test
    void noHistoryIsNullEvenWithFutureOrDifferentNamePrices() throws Exception {
        distractors();
        mvc.perform(get("/fantasy/adminPrices").param("raceId", id(race)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.drivers[?(@.id == " + ana.getId() + ")].storedPrice").value(org.hamcrest.Matchers.equalTo(java.util.Collections.singletonList(null)), List.class))
                .andExpect(jsonPath("$.drivers[?(@.id == " + ana.getId() + ")].suggestedPrice").value(org.hamcrest.Matchers.equalTo(java.util.Collections.singletonList(null)), List.class))
                .andExpect(jsonPath("$.teams[?(@.id == " + team.getId() + ")].storedPrice").value(org.hamcrest.Matchers.equalTo(java.util.Collections.singletonList(null)), List.class))
                .andExpect(jsonPath("$.teams[?(@.id == " + team.getId() + ")].suggestedPrice").value(org.hamcrest.Matchers.equalTo(java.util.Collections.singletonList(null)), List.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"saveDriverTeamPoints", "saveDriverTeamPrices"})
    void everyMissingDriverIsNamed422AndNothingIsWritten(String endpoint) throws Exception {
        removeClassifiedPrices();
        distractors();
        // The unrelated-name history used by the other scenarios must not price Bea in this case.
        driverPrices.deleteAll(driverPrices.findByDriverId(bea.getId().intValue()));
        points();
        persist(new FantasyPointsTeam(null, team, race, 91));
        List<?> before = snapshot();
        withCommittedFixtures(() -> {
            var response = mvc.perform(post("/fantasy/" + endpoint).param("raceId", id(race)))
                    .andReturn().getResponse();
            assertAll(
                    () -> assertThat(response.getStatus()).isEqualTo(422),
                    () -> assertThat(response.getContentType()).startsWith("text/plain"),
                    () -> assertThat(response.getContentAsString()).contains(race.getName(), ana.getName(), bea.getName()),
                    () -> assertThat(snapshot()).isEqualTo(before));
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {"saveDriverTeamPoints", "saveDriverTeamPrices"})
    void missingPriceLogIdentifiesRaceAndEveryMissingDriver(String endpoint) throws Exception {
        removeClassifiedPrices();
        points();
        Logger logger = (Logger) LoggerFactory.getLogger(FantasyService.class);
        ListAppender<ILoggingEvent> events = new ListAppender<>();
        events.start();
        logger.addAppender(events);
        try {
            mvc.perform(post("/fantasy/" + endpoint).param("raceId", id(race)));
            String logs = events.list.stream().map(ILoggingEvent::getFormattedMessage)
                    .collect(java.util.stream.Collectors.joining("\n"));
            assertThat(logs).containsPattern("\\b" + race.getId() + "\\b")
                    .containsPattern("\\b" + ana.getId() + "\\b")
                    .containsPattern("\\b" + bea.getId() + "\\b");
        } finally {
            logger.detachAppender(events);
            events.stop();
        }
    }

    @Test
    void unclassifiedDriverDoesNotNeedPriceForPoints() throws Exception {
        history("stored");
        persist(new Result(null, race, persist(new Driver(null, "Unpriced DNF", 9, "", season, team)), null, 0, 1));
        em.flush();
        mvc.perform(post("/fantasy/saveDriverTeamPoints").param("raceId", id(race)))
                .andExpect(status().isOk());
        assertThat(driverPoints.findByRaceId(race.getId().intValue()))
                .filteredOn(row -> row.getDriver().getName().equals("Unpriced DNF"))
                .singleElement().extracting(FantasyPointsDriver::getPoints).isEqualTo(3);
    }

    @Test
    void pricesBeforePointsReturnClear4xxWithoutChangingExistingPrices() throws Exception {
        history("stored");
        List<?> before = snapshot();
        withCommittedFixtures(() -> {
            var response = mvc.perform(post("/fantasy/saveDriverTeamPrices").param("raceId", id(race)))
                    .andReturn().getResponse();
            assertAll(
                    () -> assertThat(response.getStatus()).isBetween(400, 499),
                    () -> assertThat(response.getContentType()).startsWith("text/plain"),
                    () -> assertThat(response.getContentAsString().toLowerCase()).contains("puntos", race.getName().toLowerCase()),
                    () -> assertThat(snapshot()).isEqualTo(before));
        });
    }

    @Test
    void nextRaceIncludesDriversWithoutResultsAndEverySeasonTeam() throws Exception {
        history("stored");
        points();
        Team empty = persist(new Team(null, "No result or driver", "", "", season));
        persist(new FantasyPriceTeam(null, empty, race, 9_000_000));
        Season foreign = persist(new Season(null, "Foreign", Constants.ACTUAL_SEASON - 2, 2024));
        Team foreignTeam = persist(new Team(null, "Foreign", "", "", foreign));
        persist(new Driver(null, "Foreign", 99, "", foreign, foreignTeam));
        mvc.perform(post("/fantasy/saveDriverTeamPrices").param("raceId", id(race)))
                .andExpect(status().isOk());
        em.flush();
        em.clear();
        assertAll(
                () -> assertThat(driverPrices.findByRaceId(next.getId().intValue()))
                        .extracting(row -> row.getDriver().getId()).containsExactlyInAnyOrder(ana.getId(), bea.getId(), absent.getId()),
                () -> assertThat(driverPrices.findByRaceId(next.getId().intValue()))
                        .filteredOn(row -> row.getDriver().getId().equals(absent.getId()))
                        .singleElement().extracting(FantasyPriceDriver::getPrice).isEqualTo(8_000_000),
                () -> assertThat(teamPrices.findByRaceId(next.getId().intValue()))
                        .extracting(row -> row.getTeam().getId()).containsExactlyInAnyOrder(team.getId(), otherTeam.getId(), empty.getId()));
    }

    @Test
    void driverWithoutResultCarriesHistoricalEffectivePrice() throws Exception {
        history("stored");
        points();
        driverPrices.deleteAll(driverPrices.findByRaceId(race.getId().intValue()).stream()
                .filter(row -> row.getDriver().getId().equals(absent.getId())).toList());
        Race previous = race(season, "Previous", race.getDateStart().minusDays(7));
        persist(new FantasyPriceDriver(null, absent, previous, 9_000_000));
        mvc.perform(post("/fantasy/saveDriverTeamPrices").param("raceId", id(race)))
                .andExpect(status().isOk());
        assertThat(driverPrices.findByRaceId(next.getId().intValue()))
                .filteredOn(row -> row.getDriver().getId().equals(absent.getId()))
                .singleElement().extracting(FantasyPriceDriver::getPrice).isEqualTo(9_000_000);
    }

    @Test
    void unpricedDriverWithoutResultIsSkipped() throws Exception {
        history("stored");
        points();
        Driver newcomer = persist(new Driver(null, "Newcomer", 4, "", season, otherTeam));
        mvc.perform(post("/fantasy/saveDriverTeamPrices").param("raceId", id(race)))
                .andExpect(status().isOk());
        assertThat(driverPrices.findByRaceId(next.getId().intValue()))
                .extracting(row -> row.getDriver().getId())
                .containsExactlyInAnyOrder(ana.getId(), bea.getId(), absent.getId())
                .doesNotContain(newcomer.getId());
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 2})
    void teamPriceUsesOnlyDriversInResults(int resultCount) throws Exception {
        persist(new FantasyPriceDriver(null, ana, race, 6_000_000));
        points();
        absent.setTeam(team);
        driverPrices.findByDriverId(absent.getId().intValue()).getFirst().setPrice(30_000_000);
        if (resultCount == 1) {
            resultsRepository.deleteAll(resultsRepository.findByRaceId(race.getId().intValue()).stream()
                    .filter(row -> row.getDriver().getId().equals(bea.getId())).toList());
        }
        mvc.perform(post("/fantasy/saveDriverTeamPrices").param("raceId", id(race)))
                .andExpect(status().isOk());
        assertThat(teamPrices.findByRaceId(next.getId().intValue()))
                .filteredOn(row -> row.getTeam().getId().equals(team.getId()))
                .singleElement().extracting(FantasyPriceTeam::getPrice)
                .isEqualTo(resultCount == 1 ? 5_600_000 : 21_300_000);
        assertThat(driverPrices.findByRaceId(next.getId().intValue()))
                .filteredOn(row -> row.getDriver().getId().equals(absent.getId()))
                .singleElement().extracting(FantasyPriceDriver::getPrice).isEqualTo(30_000_000);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void teamWithoutResultsCarriesEffectivePriceOrIsSkipped(boolean hasPrice) throws Exception {
        persist(new FantasyPriceDriver(null, ana, race, 6_000_000));
        points();
        Team empty = persist(new Team(null, "Empty", "", "", season));
        if (hasPrice) persist(new FantasyPriceTeam(null, empty, earlierTie, 9_000_000));
        mvc.perform(post("/fantasy/saveDriverTeamPrices").param("raceId", id(race)))
                .andExpect(status().isOk());
        assertThat(teamPrices.findByRaceId(next.getId().intValue()))
                .filteredOn(row -> row.getTeam().getId().equals(otherTeam.getId()))
                .singleElement().extracting(FantasyPriceTeam::getPrice).isEqualTo(7_000_000);
        var emptyPrices = teamPrices.findByRaceId(next.getId().intValue()).stream()
                .filter(row -> row.getTeam().getId().equals(empty.getId())).toList();
        if (hasPrice) assertThat(emptyPrices).singleElement()
                .extracting(FantasyPriceTeam::getPrice).isEqualTo(9_000_000);
        else assertThat(emptyPrices).isEmpty();
    }

    @Test
    void nextDriverPricesUseFixedQueriesWithUnpricedAbsentDrivers() {
        persist(new FantasyPriceDriver(null, ana, race, 6_000_000));
        points();
        em.clear();
        var statistics = em.getEntityManagerFactory().unwrap(org.hibernate.SessionFactory.class).getStatistics();
        statistics.setStatisticsEnabled(true);
        try {
            var results = resultsRepository.findByRaceId(race.getId().intValue());
            statistics.clear();
            assertThat(service.createDriversPrices(results, next)).hasSize(3);
            long queries = statistics.getPrepareStatementCount();
            assertThat(queries).isEqualTo(4);
            for (int i = 0; i < 20; i++) {
                Team added = persist(new Team(null, "Unpriced team " + i, "", "", season));
                persist(new Driver(null, "Unpriced absent " + i, i + 10, "", season, added));
            }
            em.flush();
            em.clear();
            results = resultsRepository.findByRaceId(race.getId().intValue());
            statistics.clear();
            assertThat(service.createDriversPrices(results, next)).hasSize(3);
            assertThat(statistics.getPrepareStatementCount()).isEqualTo(queries);
        } finally {
            statistics.setStatisticsEnabled(false);
        }
    }

    @Test
    void adminPutCreatesInitialPricesUpdatesListedOnesAndPreservesOthersIdempotently() throws Exception {
        persist(new FantasyPriceDriver(null, ana, next, 11_000_000));
        persist(new FantasyPriceTeam(null, team, next, 12_000_000));
        String body = body("{\"id\":" + ana.getId() + ",\"price\":1000000},{\"id\":" + bea.getId()
                + ",\"price\":30000000}", "{\"id\":" + team.getId() + ",\"price\":2000000}");
        for (int attempt = 0; attempt < 2; attempt++) {
            mvc.perform(adminPut(race, body)).andExpect(status().isOk())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
                    .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.blankOrNullString())));
            em.flush();
            em.clear();
            assertThat(driverPrices.findByRaceId(race.getId().intValue())).extracting(FantasyPriceDriver::getPrice)
                    .containsExactlyInAnyOrder(1_000_000, 30_000_000, 8_000_000);
            assertThat(teamPrices.findByRaceId(race.getId().intValue())).extracting(FantasyPriceTeam::getPrice)
                    .containsExactlyInAnyOrder(2_000_000, 7_000_000);
            assertThat(driverPrices.findByRaceId(next.getId().intValue())).extracting(FantasyPriceDriver::getPrice)
                    .containsExactly(11_000_000);
            assertThat(teamPrices.findByRaceId(next.getId().intValue())).extracting(FantasyPriceTeam::getPrice)
                    .containsExactly(12_000_000);
        }
    }

    @Test
    void successfulAdminPutPublishesCacheVersionAndEvictsStats() throws Exception {
        cacheManager.getCache(Constants.CACHE_STATS).put("sentinel", "old stats");
        mvc.perform(adminPut(race, body("{\"id\":" + ana.getId() + ",\"price\":6000000}", "")))
                .andExpect(status().isOk());
        em.flush();
        em.clear();
        assertAll(
                () -> assertThat(cacheService.getCurrentVersion()).isEqualTo(42),
                () -> assertThat(cacheManager.getCache(Constants.CACHE_STATS).get("sentinel")).isNull(),
                () -> verify(socket).checkAndNotify());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "null", "{}", "{\"drivers\":[],\"teams\":[]}",
            "duplicate-driver", "duplicate-team", "foreign-driver", "foreign-team", "unknown-driver", "unknown-team",
            "null-driver", "null-team", "low-driver", "high-driver", "low-team", "high-team"})
    void invalidAdminPutIs400AndAllOrNothing(String invalid) throws Exception {
        Season foreign = persist(new Season(null, "Foreign", Constants.ACTUAL_SEASON - 1, 2025));
        Team foreignTeam = persist(new Team(null, "Foreign", "", "", foreign));
        Driver foreignDriver = persist(new Driver(null, "Foreign", 99, "", foreign, foreignTeam));
        String validDriver = "{\"id\":" + ana.getId() + ",\"price\":6000000}";
        String validTeam = "{\"id\":" + team.getId() + ",\"price\":6000000}";
        String request = switch (invalid) {
            case "duplicate-driver" -> body(validDriver + "," + validDriver, validTeam);
            case "duplicate-team" -> body(validDriver, validTeam + "," + validTeam);
            case "foreign-driver" -> body(validDriver + ",{\"id\":" + foreignDriver.getId() + ",\"price\":6000000}", validTeam);
            case "foreign-team" -> body(validDriver, validTeam + ",{\"id\":" + foreignTeam.getId() + ",\"price\":6000000}");
            case "unknown-driver" -> body(validDriver + ",{\"id\":999999,\"price\":6000000}", validTeam);
            case "unknown-team" -> body(validDriver, validTeam + ",{\"id\":999999,\"price\":6000000}");
            case "null-driver", "low-driver", "high-driver" -> body(validDriver + ",{\"id\":" + bea.getId()
                    + ",\"price\":" + invalidPrice(invalid) + "}", validTeam);
            case "null-team", "low-team", "high-team" -> body(validDriver, validTeam + ",{\"id\":" + otherTeam.getId()
                    + ",\"price\":" + invalidPrice(invalid) + "}");
            default -> invalid;
        };
        cacheManager.getCache(Constants.CACHE_STATS).put("sentinel", "old stats");
        List<?> before = snapshot();
        withCommittedFixtures(() -> {
            int response = mvc.perform(adminPut(race, request)).andReturn().getResponse().getStatus();
            assertAll(
                    () -> assertThat(response).isEqualTo(400),
                    () -> assertThat(snapshot()).isEqualTo(before),
                    () -> assertThat(cacheService.getCurrentVersion()).isEqualTo(41),
                    () -> assertThat(cacheManager.getCache(Constants.CACHE_STATS).get("sentinel", String.class)).isEqualTo("old stats"),
                    () -> verifyNoInteractions(socket));
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {"30000000.1", "999999.9", "1000000.5"})
    void fractionalPricesCannotBeSilentlyTruncated(String price) throws Exception {
        List<?> before = snapshot();
        mvc.perform(adminPut(race, body("{\"id\":" + ana.getId() + ",\"price\":" + price + "}", "")))
                .andExpect(status().isBadRequest());
        assertThat(snapshot()).isEqualTo(before);
    }

    @ParameterizedTest
    @ValueSource(strings = {"GET", "PUT"})
    void unknownRaceIs404(String method) throws Exception {
        mvc.perform(request(org.springframework.http.HttpMethod.valueOf(method), "/fantasy/adminPrices")
                .param("raceId", "999999").contentType(MediaType.APPLICATION_JSON)
                .content(body("{\"id\":" + ana.getId() + ",\"price\":6000000}", "")))
                .andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @ValueSource(strings = {"GET", "PUT"})
    void nonCurrentSeasonIs409AndCannotWrite(String method) throws Exception {
        Season old = persist(new Season(null, "Old", Constants.ACTUAL_SEASON - 1, 2025));
        Race oldRace = race(old, "Old GP", race.getDateStart().minusYears(1));
        List<?> before = snapshot();
        withCommittedFixtures(() -> {
            int response = mvc.perform(request(org.springframework.http.HttpMethod.valueOf(method), "/fantasy/adminPrices")
                    .param("raceId", id(oldRace)).contentType(MediaType.APPLICATION_JSON)
                    .content(body("{\"id\":" + ana.getId() + ",\"price\":6000000}", "")))
                    .andReturn().getResponse().getStatus();
            assertAll(() -> assertThat(response).isEqualTo(409), () -> assertThat(snapshot()).isEqualTo(before));
        });
    }

    @Test
    void electionAcceptsPricesSeededByAdmin() throws Exception {
        mvc.perform(adminPut(race, body("{\"id\":" + ana.getId() + ",\"price\":6000000}",
                "{\"id\":" + team.getId() + ",\"price\":6000000}"))).andExpect(status().isOk());
        Account owner = persist(new Account(null, "Owner", "hash", 0, "owner@example.test"));
        var election = new formula.bollo.model.FantasyElectionDTO();
        election.setDriverOne(driverMapper.driverToDriverDTO(ana));
        election.setDriverTwo(driverMapper.driverToDriverDTO(bea));
        election.setDriverThree(driverMapper.driverToDriverDTO(absent));
        election.setTeamOne(teamMapper.teamToTeamDTO(team));
        election.setTeamTwo(teamMapper.teamToTeamDTO(otherTeam));
        var raceDto = new formula.bollo.model.RaceDTO();
        raceDto.setId(race.getId());
        election.setRace(raceDto);
        assertThat(service.saveFantasyElection(election, owner.getUsername()).getStatusCode().value()).isEqualTo(200);
        em.flush();
        em.clear();
        assertThat(em.createQuery("select e from FantasyElection e", FantasyElection.class).getResultList())
                .singleElement().satisfies(saved -> {
                    assertThat(saved.getAccount().getId()).isEqualTo(owner.getId());
                    assertThat(saved.getRace().getId()).isEqualTo(race.getId());
                });
    }

    @Test
    void adminPriceResolutionHasAFixedQueryCountAsTheSeasonGrows() {
        history("stored");
        em.flush();
        em.clear();
        var statistics = em.getEntityManagerFactory().unwrap(org.hibernate.SessionFactory.class).getStatistics();
        statistics.setStatisticsEnabled(true);
        try {
            statistics.clear();
            assertThat(service.getAdminPrices(race.getId().intValue()).drivers()).hasSize(3);
            long queries = statistics.getPrepareStatementCount();
            assertThat(queries).isLessThanOrEqualTo(7);
            for (int i = 0; i < 20; i++) {
                Team added = persist(new Team(null, "Added " + i, "", "", season));
                persist(new Driver(null, "Added " + i, i + 10, "", season, added));
            }
            em.flush();
            em.clear();
            statistics.clear();
            assertThat(service.getAdminPrices(race.getId().intValue()).drivers()).hasSize(23);
            assertThat(statistics.getPrepareStatementCount()).isEqualTo(queries);
        } finally {
            statistics.setStatisticsEnabled(false);
        }
    }

    @Test
    void pointCalculationLoadsResultsAndEffectivePricesWithoutQueriesPerDriver() {
        history("calendar");
        em.flush();
        em.clear();
        var statistics = em.getEntityManagerFactory().unwrap(org.hibernate.SessionFactory.class).getStatistics();
        statistics.setStatisticsEnabled(true);
        try {
            statistics.clear();
            assertThat(service.createDriversPoints(resultsRepository.findByRaceId(race.getId().intValue()))).hasSize(2);
            assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(3);
            Position position = em.createQuery("select p from Position p where p.positionNumber = 1", Position.class).getSingleResult();
            for (int i = 0; i < 20; i++) {
                Driver added = persist(new Driver(null, "Extra " + i, i + 10, "", season, team));
                persist(new Result(null, race, added, position, 0, 0));
                persist(new FantasyPriceDriver(null, added, earlierTie, 6_000_000));
            }
            em.flush();
            em.clear();
            statistics.clear();
            assertThat(service.createDriversPoints(resultsRepository.findByRaceId(race.getId().intValue()))).hasSize(22);
            assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(3);
        } finally {
            statistics.setStatisticsEnabled(false);
        }
    }

    private void history(String scenario) {
        distractors();
        if (List.of("stored", "calendar", "date-tie", "target-date-tie").contains(scenario)) {
            Season old = persist(new Season(null, "Competitor", Constants.ACTUAL_SEASON - 1, 2025));
            Team oldTeam = persist(new Team(null, team.getName(), "", "", old));
            Driver oldDriver = persist(new Driver(null, ana.getName(), 55, "", old, oldTeam));
            pricePair(oldDriver, oldTeam, race(old, "Old expensive", race.getDateStart().minusYears(1)), 29_000_000);
        }
        switch (scenario) {
            case "stored" -> {
                pricePair(ana, team, race(season, "Older expensive", race.getDateStart().minusDays(1)), 25_000_000);
                pricePair(ana, team, race, 6_000_000);
            }
            case "calendar" -> {
                Race latest = race(season, "Latest earlier", race.getDateStart().minusDays(1));
                pricePair(ana, team, latest, 6_000_000);
                Race higherIdButOlder = race(season, "Older", race.getDateStart().minusDays(3));
                pricePair(ana, team, higherIdButOlder, 25_000_000);
                race(season, "Gap without price", race.getDateStart().minusHours(1));
            }
            case "date-tie" -> {
                Race lowerId = race(season, "Lower tie", race.getDateStart().minusDays(1));
                Race higherId = race(season, "Higher tie", lowerId.getDateStart());
                pricePair(ana, team, lowerId, 25_000_000);
                pricePair(ana, team, higherId, 6_000_000);
            }
            case "target-date-tie" -> pricePair(ana, team, earlierTie, 6_000_000);
            case "previous-season", "skip-empty-season" -> {
                int offset = scenario.equals("skip-empty-season") ? 2 : 1;
                Season old = persist(new Season(null, "Old", Constants.ACTUAL_SEASON - offset, 2026 - offset));
                Team oldTeam = persist(new Team(null, team.getName(), "", "", old));
                Driver oldDriver = persist(new Driver(null, ana.getName(), 55, "", old, oldTeam));
                Race latest = race(old, "Latest old", race.getDateStart().minusYears(1));
                Race tied = race(old, "Latest old tie", latest.getDateStart());
                pricePair(oldDriver, oldTeam, latest, 15_000_000);
                pricePair(oldDriver, oldTeam, tied, 6_000_000);
                Race higherIdOlderDate = race(old, "Older old", latest.getDateStart().minusDays(1));
                pricePair(oldDriver, oldTeam, higherIdOlderDate, 25_000_000);
                Season older = persist(new Season(null, "Older", Constants.ACTUAL_SEASON - offset - 1, 2025 - offset));
                Team olderTeam = persist(new Team(null, team.getName(), "", "", older));
                Driver olderDriver = persist(new Driver(null, ana.getName(), 44, "", older, olderTeam));
                pricePair(olderDriver, olderTeam, race(older, "Older season", latest.getDateStart().plusMonths(1)), 29_000_000);
                if (scenario.equals("skip-empty-season")) {
                    Season gap = persist(new Season(null, "Gap season", Constants.ACTUAL_SEASON - 1, 2025));
                    Team gapTeam = persist(new Team(null, team.getName(), "", "", gap));
                    persist(new Driver(null, ana.getName(), 55, "", gap, gapTeam));
                    race(gap, "No price in intervening season", latest.getDateStart().plusMonths(2));
                    race(season, "No price in current season", race.getDateStart().minusDays(1));
                }
            }
            default -> throw new IllegalArgumentException(scenario);
        }
        em.flush();
    }

    private void distractors() {
        pricePair(ana, team, next, 29_000_000);
        next = race(season, "Future tie", race.getDateStart());
        pricePair(ana, team, next, 28_000_000);
        Season future = persist(new Season(null, "Future", Constants.ACTUAL_SEASON + 1, 2027));
        Team futureTeam = persist(new Team(null, team.getName(), "", "", future));
        Driver futureDriver = persist(new Driver(null, ana.getName(), 77, "", future, futureTeam));
        pricePair(futureDriver, futureTeam, race(future, "Future season", race.getDateStart().minusYears(2)), 27_000_000);
        Race earlier = race(season, "Other names", race.getDateStart().minusDays(10));
        pricePair(bea, otherTeam, earlier, 26_000_000);
    }

    private void points() {
        persist(new FantasyPointsDriver(null, ana, race, 10));
        persist(new FantasyPointsDriver(null, bea, race, 10));
        em.flush();
    }

    private void removeClassifiedPrices() {
        driverPrices.deleteAll(driverPrices.findByRaceId(race.getId().intValue()).stream()
                .filter(row -> !row.getDriver().getId().equals(absent.getId())).toList());
    }

    private List<?> snapshot() {
        return new TransactionTemplate(transactionManager).execute(status -> {
            em.flush();
            em.clear();
            return List.of(
                em.createQuery("select concat(p.id, ':', p.driver.id, ':', p.race.id, ':', p.price) from FantasyPriceDriver p order by p.id", String.class).getResultList(),
                em.createQuery("select concat(p.id, ':', p.team.id, ':', p.race.id, ':', p.price) from FantasyPriceTeam p order by p.id", String.class).getResultList(),
                em.createQuery("select concat(p.id, ':', p.driver.id, ':', p.race.id, ':', p.points) from FantasyPointsDriver p order by p.id", String.class).getResultList(),
                em.createQuery("select concat(p.id, ':', p.team.id, ':', p.race.id, ':', p.points) from FantasyPointsTeam p order by p.id", String.class).getResultList(),
                cacheService.getCurrentVersion());
        });
    }

    @FunctionalInterface
    private interface HttpAssertion { void run() throws Exception; }

    private static class HttpInterceptors extends InterceptorRegistry {
        void applyTo(StandaloneMockMvcBuilder builder) {
            // Reuse production path registration, so adding the endpoint without publication fails.
            for (Object entry : getInterceptors()) {
                if (entry instanceof MappedInterceptor mapped) {
                    builder.addMappedInterceptors(mapped.getIncludePathPatterns(), mapped.getInterceptor());
                } else {
                    builder.addInterceptors((HandlerInterceptor) entry);
                }
            }
        }
    }

    private void withCommittedFixtures(HttpAssertion assertion) throws Exception {
        // The HTTP write owns its transaction: observe real rollback, not uncommitted test state.
        TestTransaction.flagForCommit();
        TestTransaction.end();
        try {
            assertion.run();
        } finally {
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                for (String entity : List.of("FantasyElection", "FantasyPriceDriver", "FantasyPriceTeam",
                        "FantasyPointsDriver", "FantasyPointsTeam", "Result", "Driver", "Team", "Race", "Position", "Season", "Cache")) {
                    em.createQuery("delete from " + entity).executeUpdate();
                }
            });
            TestTransaction.start();
        }
    }

    private String invalidPrice(String scenario) {
        return scenario.startsWith("null") ? "null" : scenario.startsWith("low") ? "999999" : "30000001";
    }

    private String body(String drivers, String teams) { return "{\"drivers\":[" + drivers + "],\"teams\":[" + teams + "]}"; }
    private String id(Race value) { return value.getId().toString(); }
    private MockHttpServletRequestBuilder adminPut(Race value, String body) {
        return put("/fantasy/adminPrices").param("raceId", id(value)).contentType(MediaType.APPLICATION_JSON).content(body);
    }
    private Race race(Season value, String name, LocalDateTime date) {
        return persist(new Race(null, name, "", "", date, value, 0));
    }
    private void pricePair(Driver driver, Team value, Race event, int price) {
        persist(new FantasyPriceDriver(null, driver, event, price));
        persist(new FantasyPriceTeam(null, value, event, price));
    }
    private <T> T persist(T entity) { em.persist(entity); return entity; }
}
