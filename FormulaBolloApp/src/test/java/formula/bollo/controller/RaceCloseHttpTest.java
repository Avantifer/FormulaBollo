package formula.bollo.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Consumer;
import java.util.stream.Stream;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.cache.CacheManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.jpa.repository.support.SimpleJpaRepository;
import org.springframework.http.*;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.*;
import org.springframework.web.server.ResponseStatusException;

import formula.bollo.entity.*;
import formula.bollo.model.*;
import formula.bollo.repository.FantasyPriceTeamRepository;
import formula.bollo.service.*;
import formula.bollo.utils.Constants;
import jakarta.persistence.EntityManager;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:race-close-http;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa",
    "spring.datasource.password=", "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.sql.init.mode=never",
    "spring.jpa.open-in-view=false", "jwt.secret=race-close-http-test-secret-at-least-32-bytes",
    "spring.mail.host=localhost", "spring.mail.username=race-test@example.com"
})
@AutoConfigureMockMvc(addFilters = false)
@Execution(ExecutionMode.SAME_THREAD)
class RaceCloseHttpTest {
    // Deliberately NO test @Transactional: requests must commit/roll back themselves.
    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;
    @Autowired EntityManager em;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager manager;
    @Autowired CacheManager caches;
    @MockitoSpyBean ResultService results;
    @MockitoSpyBean RaceService races;
    @MockitoSpyBean FantasyService fantasy;
    @MockitoSpyBean CacheNotifier notifier;
    @MockitoSpyBean FantasyPriceTeamRepository teamPrices;

    private static final List<String> TABLES = List.of("race", "result", "fantasy_points_driver",
            "fantasy_points_team", "fantasy_price_driver", "fantasy_price_team");
    private Race race;
    private Race next;
    private Race later;
    private Driver ana;
    private Driver bea;
    private Position winner;
    private Position second;
    private TransactionTemplate fresh;

    // A wire contract independent of any future production close DTO/method, so it compiles today.
    record CloseBody(RaceDTO race, List<ResultDTO> results) { }

    @BeforeEach
    void seedCommittedData() {
        fresh = new TransactionTemplate(manager);
        fresh.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        fresh.executeWithoutResult(tx -> {
            Season season = persist(new Season(null, "Close season", 1, 2026));
            Team team = persist(new Team(null, "Real team", "car", "logo", season));
            ana = persist(new Driver(null, "Ana", 1, "ana", season, team));
            bea = persist(new Driver(null, "Bea", 2, "bea", season, team));
            race = persist(new Race(null, "GP", "flag", "circuit",
                    LocalDateTime.of(2026, 5, 1, 12, 0), season, 0));
            next = persist(new Race(null, "Next", "flag", "circuit", race.getDateStart().plusDays(7), season, 0));
            later = persist(new Race(null, "Later", "flag", "circuit", race.getDateStart().plusDays(14), season, 0));
            winner = persist(new Position(null, 1, 25));
            second = persist(new Position(null, 2, 18));
            persist(new Result(null, race, ana, second, 0, 0));
            persist(new Result(null, race, bea, winner, 1, 1));
            persist(new FantasyPointsDriver(null, ana, race, 99));
            persist(new FantasyPointsDriver(null, bea, race, 98));
            persist(new FantasyPointsTeam(null, team, race, 97));
            persist(new FantasyPriceDriver(null, ana, race, 25_000_000));
            persist(new FantasyPriceDriver(null, bea, race, 25_000_000));
            persist(new FantasyPriceDriver(null, ana, next, 31_000_000));
            persist(new FantasyPriceDriver(null, bea, next, 32_000_000));
            persist(new FantasyPriceTeam(null, team, next, 33_000_000));
            persist(new Cache("general_cache", 40));
        });
        caches.getCache(Constants.CACHE_STATS).put("close-sentinel", "old statistics");
        clearInvocations(results, races, fantasy, notifier, teamPrices);
    }

    @AfterEach
    void cleanCommittedData() {
        // Do not leave fault injection active during cleanup or the following test.
        reset(results, races, fantasy, notifier, teamPrices);
        fresh.executeWithoutResult(tx -> {
            for (String table : List.of("fantasy_price_team", "fantasy_price_driver", "fantasy_points_team",
                    "fantasy_points_driver", "result", "race", "driver", "team", "position", "season", "cache")) {
                jdbc.update("delete from " + table);
            }
        });
        caches.getCache(Constants.CACHE_STATS).clear();
    }

    private <T> T persist(T entity) { em.persist(entity); return entity; }

    private CloseBody body() {
        SeasonDTO season = new SeasonDTO(race.getSeason().getId(), "Stale season", 1, "2026");
        RaceDTO submitted = new RaceDTO(race.getId(), "GP", "new flag", "new circuit",
                race.getDateStart().plusHours(2), season, 0); // Server must force finished=1.
        // Same identities as the DB, but intentionally stale fields and a WRONG team association.
        DriverDTO first = new DriverDTO(ana.getId(), "Stale Ana", 99, "stale", season, null);
        DriverDTO runnerUp = new DriverDTO(bea.getId(), "Stale Bea", 98, "stale", season, null);
        List<ResultDTO> batch = new ArrayList<>(List.of(
                new ResultDTO(null, copy(submitted), first, new PositionDTO(winner.getId(), 1, 0), 1, 1),
                new ResultDTO(null, copy(submitted), runnerUp, new PositionDTO(second.getId(), 2, 0), 0, 0)));
        return new CloseBody(submitted, batch);
    }

    private RaceDTO copy(RaceDTO value) {
        return json.readValue(json.writeValueAsString(value), RaceDTO.class);
    }

    private MvcResult close(CloseBody body) throws Exception {
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
        return mvc.perform(put("/races/close").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body))).andReturn();
    }

    private Map<String, List<Map<String, Object>>> snapshot() {
        return fresh.execute(tx -> {
            Map<String, List<Map<String, Object>>> state = new LinkedHashMap<>();
            for (String table : TABLES) state.put(table, jdbc.queryForList("select * from " + table + " order by id"));
            return state;
        });
    }

    private Map<String, List<Map<String, Object>>> withoutGeneratedIds(Map<String, List<Map<String, Object>>> state) {
        Map<String, List<Map<String, Object>>> normalized = new LinkedHashMap<>();
        state.forEach((table, rows) -> normalized.put(table, rows.stream().map(row -> {
            Map<String, Object> values = new TreeMap<>(row);
            if (!table.equals("race")) values.remove("ID");
            return values;
        }).sorted(Comparator.comparing(Object::toString)).toList()));
        return normalized;
    }

    private void restore(Map<String, List<Map<String, Object>>> state) {
        fresh.executeWithoutResult(tx -> {
            List<String> reversed = new ArrayList<>(TABLES);
            Collections.reverse(reversed);
            reversed.forEach(table -> jdbc.update("delete from " + table));
            state.forEach((table, rows) -> rows.forEach(row -> jdbc.update("insert into " + table + " ("
                    + String.join(",", row.keySet()) + ") values ("
                    + String.join(",", Collections.nCopies(row.size(), "?")) + ")", row.values().toArray())));
        });
    }

    private void assertFailure(CloseBody body, int status, String message) throws Exception {
        // Stubbing a spy through Spring's cache proxy can itself run its eviction advice.
        // Establish the cache baseline after fault injection and before the actual HTTP call.
        caches.getCache(Constants.CACHE_STATS).put("close-sentinel", "old statistics");
        var before = snapshot();
        int version = version();
        MvcResult response = close(body);
        assertAll(
                () -> assertThat(response.getResponse().getStatus()).isEqualTo(status),
                () -> assertThat(response.getResponse().getContentAsString(StandardCharsets.UTF_8)).isEqualTo(message),
                () -> assertThat(snapshot()).isEqualTo(before),
                () -> assertThat(version()).isEqualTo(version),
                () -> verify(notifier, never()).publish(),
                () -> assertThat(caches.getCache(Constants.CACHE_STATS).get("close-sentinel", String.class))
                        .isEqualTo("old statistics"));
    }

    private int version() {
        return fresh.execute(tx -> jdbc.queryForObject("select version from cache where name='general_cache'", Integer.class));
    }

    @Test
    void closeCommitsTheSameRowsAsTheFourLegacyRequestsUsingDatabaseFields() throws Exception {
        CloseBody request = body();
        var before = snapshot();
        mvc.perform(put("/results/save").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(request.results()))).andExpect(status().isOk());
        RaceDTO finished = copy(request.race());
        finished.setFinished(1);
        mvc.perform(put("/races/save").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(finished))).andExpect(status().isOk());
        mvc.perform(post("/fantasy/saveDriverTeamPoints").param("raceId", race.getId().toString()))
                .andExpect(status().isOk());
        mvc.perform(post("/fantasy/saveDriverTeamPrices").param("raceId", race.getId().toString()))
                .andExpect(status().isOk());
        var expected = withoutGeneratedIds(snapshot());
        // Prove the reference calls actually changed each of the six tables.
        TABLES.forEach(table -> assertThat(expected.get(table)).as(table)
                .isNotEqualTo(withoutGeneratedIds(before).get(table)));
        restore(before);
        MvcResult response = close(request);
        assertAll(
                () -> assertThat(response.getResponse().getStatus()).isEqualTo(200),
                () -> assertThat(response.getResponse().getContentType()).startsWith("text/plain"),
                () -> assertThat(response.getResponse().getContentAsString()).isNotBlank(),
                () -> assertThat(withoutGeneratedIds(snapshot())).isEqualTo(expected),
                () -> fresh.executeWithoutResult(tx -> {
                    assertThat(em.find(Position.class, winner.getId()).getPoints()).isEqualTo(25);
                    assertThat(em.find(Driver.class, ana.getId()).getName()).isEqualTo("Ana");
                }));
    }

    @Test
    void stepsShareOneTransactionAndFlushAndClearBeforeReadingTheNextStep() throws Exception {
        List<Object> managedByPreviousStep = new ArrayList<>();
        List<String> steps = new ArrayList<>();
        List<Integer> completion = new ArrayList<>();
        Object[] transaction = new Object[1];
        doAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
            transaction[0] = em.getDelegate();
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) { completion.add(status); }
                @Override public void beforeCommit(boolean readOnly) {
                    assertThat(caches.getCache(Constants.CACHE_STATS).get("close-sentinel")).isNotNull();
                    assertThat(jdbc.queryForObject("select version from cache where name='general_cache'", Integer.class)).isEqualTo(40);
                }
            });
            Object response = call.callRealMethod();
            managedByPreviousStep.addAll(em.createQuery("from Result", Result.class).getResultList());
            steps.add("results");
            return response;
        }).when(results).saveResults(anyList());
        doAnswer(call -> {
            assertCleared(managedByPreviousStep, transaction[0]);
            assertThat(jdbc.queryForObject("select pole from result where driver_id=?", Integer.class, ana.getId())).isEqualTo(1);
            Object response = call.callRealMethod();
            managedByPreviousStep.add(em.find(Race.class, race.getId()));
            steps.add("race");
            return response;
        }).when(races).saveRace(any());
        doAnswer(call -> {
            assertCleared(managedByPreviousStep, transaction[0]);
            assertThat(em.find(Race.class, race.getId()).getFinished()).isEqualTo(1);
            Object response = call.callRealMethod();
            managedByPreviousStep.addAll(em.createQuery("from FantasyPointsDriver", FantasyPointsDriver.class).getResultList());
            steps.add("points");
            return response;
        }).when(fantasy).saveDriverTeamPoints(anyInt());
        doAnswer(call -> {
            assertCleared(managedByPreviousStep, transaction[0]);
            steps.add("prices");
            return call.callRealMethod();
        }).when(fantasy).saveDriverTeamPrices(anyInt());
        doAnswer(call -> {
            // A separate transaction can see the new rows only once the close committed.
            Integer committedFinished = fresh.execute(tx -> jdbc.queryForObject("select finished from race where id=?",
                    Integer.class, race.getId()));
            assertThat(committedFinished).isEqualTo(1);
            return call.callRealMethod();
        }).when(notifier).publish();
        caches.getCache(Constants.CACHE_STATS).put("close-sentinel", "old statistics");
        MvcResult response = close(body());
        assertAll(
                () -> assertThat(response.getResponse().getStatus()).isEqualTo(200),
                () -> assertThat(steps).containsExactly("results", "race", "points", "prices"),
                () -> assertThat(completion).containsExactly(TransactionSynchronization.STATUS_COMMITTED),
                () -> assertThat(version()).isEqualTo(41),
                () -> verify(notifier, times(1)).publish(),
                () -> assertThat(caches.getCache(Constants.CACHE_STATS).get("close-sentinel")).isNull());
    }

    private void assertCleared(List<Object> previous, Object transaction) {
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
        assertThat(em.getDelegate()).isSameAs(transaction);
        previous.forEach(entity -> assertThat(em.contains(entity)).as("previous step entity must be detached").isFalse());
        previous.clear();
    }

    @Test
    void submittedDateSelectsTheNextRaceAfterTheUpdatedCalendarPosition() throws Exception {
        CloseBody request = body();
        request.race().setDateStart(next.getDateStart().plusDays(1));
        var oldNextPrices = snapshot().get("fantasy_price_driver").stream()
                .filter(row -> Objects.equals(row.get("RACE_ID"), next.getId())).toList();
        MvcResult response = close(request);
        assertAll(
                () -> assertThat(response.getResponse().getStatus()).isEqualTo(200),
                () -> fresh.executeWithoutResult(tx -> {
                    assertThat(em.find(Race.class, race.getId()).getDateStart()).isEqualTo(request.race().getDateStart());
                    assertThat(jdbc.queryForObject("select count(*) from fantasy_price_driver where race_id=?", Integer.class, later.getId())).isEqualTo(2);
                    assertThat(jdbc.queryForObject("select count(*) from fantasy_price_team where race_id=?", Integer.class, later.getId())).isEqualTo(1);
                }),
                () -> assertThat(snapshot().get("fantasy_price_driver").stream()
                        .filter(row -> Objects.equals(row.get("RACE_ID"), next.getId())).toList()).isEqualTo(oldNextPrices));
    }

    @Test
    void lastRaceIsSuccessfulAndCommitsPointsWithoutChangingPrices() throws Exception {
        CloseBody request = body();
        request.race().setDateStart(later.getDateStart().plusDays(1));
        var before = snapshot();
        MvcResult response = close(request);
        var after = snapshot();
        assertAll(
                () -> assertThat(response.getResponse().getStatus()).isEqualTo(200),
                () -> assertThat(response.getResponse().getContentType()).startsWith("text/plain"),
                () -> assertThat(response.getResponse().getContentAsString()).isNotBlank(),
                () -> assertThat(after.get("fantasy_price_driver")).isEqualTo(before.get("fantasy_price_driver")),
                () -> assertThat(after.get("fantasy_price_team")).isEqualTo(before.get("fantasy_price_team")),
                () -> assertThat(after.get("fantasy_points_driver")).isNotEqualTo(before.get("fantasy_points_driver")),
                () -> assertThat(after.get("fantasy_points_team")).isNotEqualTo(before.get("fantasy_points_team")),
                () -> assertThat(version()).isEqualTo(41));
    }

    static Stream<Consumer<CloseBody>> invalidBatches() {
        return Stream.of(
                b -> b.results().clear(), b -> b.results().add(null),
                b -> b.results().get(1).setRace(null), b -> b.results().get(1).getRace().setId(null),
                b -> b.results().get(1).getRace().setId(9999L),
                b -> b.results().forEach(row -> row.getRace().setId(9999L)),
                b -> b.results().get(1).getRace().setSeason(null),
                b -> b.results().get(1).getRace().getSeason().setId(null),
                b -> b.results().get(1).getRace().getSeason().setId(9999L),
                b -> b.results().get(1).setDriver(null), b -> b.results().get(1).getDriver().setId(null),
                b -> b.results().get(1).getDriver().setSeason(null),
                b -> b.results().get(1).getDriver().getSeason().setId(null),
                b -> b.results().get(1).getDriver().getSeason().setId(9999L),
                b -> b.results().get(1).setDriver(b.results().get(0).getDriver()),
                b -> b.results().get(1).setPosition(new PositionDTO()),
                b -> b.results().get(1).setPosition(b.results().get(0).getPosition()),
                b -> b.results().get(1).setPole(1), b -> b.results().get(1).setFastlap(1),
                b -> b.results().get(1).setPole(-1), b -> b.results().get(1).setPole(2),
                b -> b.results().get(1).setFastlap(-1), b -> b.results().get(1).setFastlap(2));
    }

    @ParameterizedTest
    @MethodSource("invalidBatches")
    void invalidBatchReturns400AndDoesNotWrite(Consumer<CloseBody> invalidate) throws Exception {
        CloseBody request = body();
        invalidate.accept(request);
        var before = snapshot();
        MvcResult response = close(request);
        assertAll(
                () -> assertThat(response.getResponse().getStatus()).isEqualTo(400),
                () -> assertThat(snapshot()).isEqualTo(before),
                () -> assertThat(version()).isEqualTo(40),
                () -> verify(notifier, never()).publish());
    }

    @ParameterizedTest
    @ValueSource(strings = {"race", "id", "results"})
    void missingRequiredCloseFieldsDoNotWrite(String missing) throws Exception {
        CloseBody request = body();
        if (missing.equals("race")) request = new CloseBody(null, request.results());
        else if (missing.equals("id")) request.race().setId(null);
        else request = new CloseBody(request.race(), null);
        var before = snapshot();
        MvcResult response = close(request);
        assertAll(
                () -> assertThat(response.getResponse().getStatus()).isEqualTo(400),
                () -> assertThat(snapshot()).isEqualTo(before),
                () -> assertThat(version()).isEqualTo(40));
    }

    @Test
    void unknownRaceIs404WithoutWrites() throws Exception {
        CloseBody request = body();
        request.race().setId(9999L);
        request.results().forEach(row -> row.getRace().setId(9999L));
        assertFailure(request, 404, "No se ha encontrado la carrera");
    }

    @Test
    void failureUpdatingRaceRollsBackAlreadyReplacedResults() throws Exception {
        CloseBody request = body();
        request.race().setName(next.getName()); // Real unique constraint, after result replacement.
        assertFailure(request, 409,
                "Ya existe una carrera con ese nombre en la temporada o hay otro guardado simultáneo");
    }

    @Test
    void missingDriverPriceRollsBackResultsAndFinishedRace() throws Exception {
        fresh.executeWithoutResult(tx -> jdbc.update("delete from fantasy_price_driver where driver_id=?", bea.getId()));
        assertFailure(body(), 422, "Faltan precios para Bea en la carrera GP");
    }

    @ParameterizedTest
    @CsvSource({"results,422", "results,503", "race,422", "race,503",
            "points,422", "points,503", "prices,422", "prices,503"})
    void returnedErrorStatusAndTextAtEachStepRollBackEveryEarlierWrite(String step, int status) throws Exception {
        ResponseEntity<String> failure = ResponseEntity.status(status).body("Rejected by " + step);
        switch (step) {
            case "results" -> doReturn(failure).when(results).saveResults(anyList());
            case "race" -> doReturn(failure).when(races).saveRace(any());
            case "points" -> doReturn(failure).when(fantasy).saveDriverTeamPoints(anyInt());
            case "prices" -> doReturn(failure).when(fantasy).saveDriverTeamPrices(anyInt());
            default -> throw new AssertionError(step);
        }
        assertFailure(body(), status, "Rejected by " + step);
        // Later steps must not be attempted even for an error returned rather than thrown.
        if (step.equals("results")) verify(races, never()).saveRace(any());
        if (List.of("results", "race").contains(step)) verify(fantasy, never()).saveDriverTeamPoints(anyInt());
        if (!step.equals("prices")) verify(fantasy, never()).saveDriverTeamPrices(anyInt());
    }

    @Test
    void conflictAfterPriceInsertsRollsBackAllSixTables() throws Exception {
        List<Boolean> reachedAfterWrites = new ArrayList<>();
        doAnswer(call -> {
            Object saved = new SimpleJpaRepository<>(FantasyPriceTeam.class, em)
                    .saveAllAndFlush(call.<Iterable<FantasyPriceTeam>>getArgument(0));
            assertThat(jdbc.queryForObject("select finished from race where id=?", Integer.class, race.getId())).isEqualTo(1);
            assertThat(jdbc.queryForObject("select points from fantasy_points_driver where driver_id=?", Integer.class, ana.getId())).isNotEqualTo(99);
            reachedAfterWrites.add(true);
            throw new DataIntegrityViolationException("Forced conflict AFTER prices flushed: " + saved.getClass().getSimpleName());
        }).when(teamPrices).saveAllAndFlush(any());
        assertFailure(body(), 409, "Otro guardado simultáneo ha modificado los precios. Vuelve a intentarlo");
        assertThat(reachedAfterWrites).containsExactly(true);
    }

    @Test
    void thrownPriceFailureExitsTheTransactionByRollbackBeforeHttpAdviceHandlesIt() throws Exception {
        List<Integer> completion = new ArrayList<>();
        doAnswer(call -> {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) { completion.add(status); }
            });
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Prices temporarily unavailable");
        }).when(fantasy).saveDriverTeamPrices(anyInt());
        assertFailure(body(), 503, "Prices temporarily unavailable");
        assertThat(completion).containsExactly(TransactionSynchronization.STATUS_ROLLED_BACK);
    }

    @Test
    void deploySmokeTableIncludesTheCloseEndpoint() throws Exception {
        Path deploy = Path.of("..", "DEPLOY.md");
        assertThat(Files.readAllLines(deploy).stream()
                .anyMatch(line -> line.strip().startsWith("|") && line.contains("/races/close") && line.contains("PUT")))
                .as("DEPLOY.md smoke checks need a PUT /races/close row").isTrue();
    }
}
