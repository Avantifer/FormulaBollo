package formula.bollo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.AdditionalAnswers.delegatesTo;
import static org.mockito.Mockito.mock;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.CsvSource;
import org.mapstruct.factory.Mappers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import formula.bollo.entity.*;
import formula.bollo.impl.*;
import formula.bollo.mapper.*;
import formula.bollo.repository.*;
import jakarta.persistence.EntityManager;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:fantasy-save-regression;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.jdbc.batch_size=25",
        "spring.jpa.properties.hibernate.order_inserts=true",
        "spring.sql.init.mode=never"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Execution(ExecutionMode.SAME_THREAD)
class FantasySaveRegressionJpaTest {
    @Autowired EntityManager em;
    @Autowired AccountRepository accounts;
    @Autowired RaceRepository races;
    @Autowired ResultRepository results;
    @Autowired FantasyElectionRepository elections;
    @Autowired FantasyPointsDriverRepository driverPoints;
    @Autowired FantasyPointsTeamRepository teamPoints;
    @Autowired FantasyPriceDriverRepository driverPrices;
    @Autowired FantasyPriceTeamRepository teamPrices;
    @Autowired PlatformTransactionManager transactionManager;

    FantasyService service;
    Race race;
    Race nextRace;
    Driver first;
    Driver second;
    Team team;

    @BeforeEach
    void seed() {
        Season season = persist(new Season(null, "Season", 1, 2026));
        team = persist(new Team(null, "Team", "", "", season));
        first = persist(new Driver(null, "Ana", 1, "", season, team));
        second = persist(new Driver(null, "Bea", 2, "", season, team));
        race = persist(new Race(null, "GP", "", "", LocalDateTime.of(2026, 1, 1, 12, 0), season, 1));
        nextRace = persist(new Race(null, "Next GP", "", "", race.getDateStart().plusDays(7), season, 0));
        Position winner = persist(new Position(null, 1, 25));
        Position runnerUp = persist(new Position(null, 2, 18));
        persist(new Result(null, race, first, winner, 0, 0));
        persist(new Result(null, race, second, runnerUp, 0, 0));
        persist(new FantasyPriceDriver(null, first, race, 25_000_000));
        persist(new FantasyPriceDriver(null, second, race, 25_000_000));
        em.flush();
        service = createService(driverPoints, teamPoints, driverPrices, teamPrices);
    }

    @Test
    void savingPointsTwiceReplacesEveryDriverAndTeamValue() {
        savePoints();
        flushAndClear();
        assertDriverPoints(12, 11);
        assertTeamPoints(12);

        for (Result result : results.findByRaceId(race.getId().intValue())) {
            result.setPole(1);
            result.setFastlap(1);
        }
        em.flush();

        savePoints();
        flushAndClear();

        assertDriverPoints(17, 16);
        assertTeamPoints(17);
    }

    @Test
    void savingPricesTwiceReplacesEveryDriverAndTeamValueForNextRace() {
        persist(new FantasyPointsDriver(null, first, race, 5));
        persist(new FantasyPointsDriver(null, second, race, 10));
        em.flush();
        savePrices();
        flushAndClear();
        assertPrices(23_750_000, 27_000_000, 26_025_000);

        for (FantasyPointsDriver points : driverPoints.findByRaceId(race.getId().intValue())) {
            points.setPoints(points.getDriver().getId().equals(first.getId()) ? 20 : 15);
        }
        em.flush();

        savePrices();
        flushAndClear();

        assertPrices(29_000_000, 28_000_000, 28_700_000);
        assertThat(driverPrices.findByRaceId(race.getId().intValue()))
                .extracting(FantasyPriceDriver::getPrice).containsExactlyInAnyOrder(25_000_000, 25_000_000);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void pointsInsertConstraintViolationReturns409(boolean failDriverInsert) {
        FantasyService failingService = createService(
                failDriverInsert ? failingInserts(FantasyPointsDriverRepository.class, driverPoints) : driverPoints,
                failDriverInsert ? teamPoints : failingInserts(FantasyPointsTeamRepository.class, teamPoints),
                driverPrices, teamPrices);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> failingService.saveDriverTeamPoints(race.getId().intValue()));

        assertThat(error.getStatusCode().value()).isEqualTo(409);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void pricesInsertConstraintViolationReturns409(boolean failDriverInsert) {
        persist(new FantasyPointsDriver(null, first, race, 5));
        persist(new FantasyPointsDriver(null, second, race, 10));
        em.flush();
        FantasyService failingService = createService(driverPoints, teamPoints,
                failDriverInsert ? failingInserts(FantasyPriceDriverRepository.class, driverPrices) : driverPrices,
                failDriverInsert ? teamPrices : failingInserts(FantasyPriceTeamRepository.class, teamPrices));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> failingService.saveDriverTeamPrices(race.getId().intValue()));

        assertThat(error.getStatusCode().value()).isEqualTo(409);
    }

    @ParameterizedTest
    @CsvSource({"false,false", "false,true", "true,false", "true,true"})
    void lateConflictRollsBackBothReplacements(boolean prices, boolean concurrency) {
        savePoints();
        savePrices();
        flushAndClear();
        List<Long> oldDriverPoints = driverPoints.findAll().stream().map(FantasyPointsDriver::getId).toList();
        List<Long> oldTeamPoints = teamPoints.findAll().stream().map(FantasyPointsTeam::getId).toList();
        List<Long> oldDriverPrices = driverPrices.findAll().stream().map(FantasyPriceDriver::getId).toList();
        List<Long> oldTeamPrices = teamPrices.findAll().stream().map(FantasyPriceTeam::getId).toList();
        // Commit the originals so a new transaction must restore them after its deletes and inserts.
        TestTransaction.flagForCommit();
        TestTransaction.end();
        try {
            FantasyService failing = createService(driverPoints,
                    prices ? teamPoints : failingAfterFlush(FantasyPointsTeamRepository.class, teamPoints, concurrency),
                    driverPrices,
                    prices ? failingAfterFlush(FantasyPriceTeamRepository.class, teamPrices, concurrency) : teamPrices);
            ResponseStatusException error = assertThrows(ResponseStatusException.class,
                    () -> new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        if (prices) failing.saveDriverTeamPrices(race.getId().intValue());
                        else failing.saveDriverTeamPoints(race.getId().intValue());
                    }));
            assertThat(error.getStatusCode().value()).isEqualTo(409);
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                assertThat(driverPoints.findAll()).extracting(FantasyPointsDriver::getId)
                        .containsExactlyInAnyOrderElementsOf(oldDriverPoints);
                assertThat(teamPoints.findAll()).extracting(FantasyPointsTeam::getId)
                        .containsExactlyInAnyOrderElementsOf(oldTeamPoints);
                assertThat(driverPrices.findAll()).extracting(FantasyPriceDriver::getId)
                        .containsExactlyInAnyOrderElementsOf(oldDriverPrices);
                assertThat(teamPrices.findAll()).extracting(FantasyPriceTeam::getId)
                        .containsExactlyInAnyOrderElementsOf(oldTeamPrices);
                assertDriverPoints(12, 11);
                assertTeamPoints(12);
                assertPrices(27_400_000, 27_200_000, 27_340_000);
            });
        } finally {
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                teamPrices.deleteAllInBatch();
                driverPrices.deleteAllInBatch();
                teamPoints.deleteAllInBatch();
                driverPoints.deleteAllInBatch();
                results.deleteAllInBatch();
                races.deleteAllInBatch();
                em.createQuery("delete from Driver").executeUpdate();
                em.createQuery("delete from Team").executeUpdate();
                em.createQuery("delete from Position").executeUpdate();
                em.createQuery("delete from Season").executeUpdate();
            });
        }
    }

    private <T> T failingAfterFlush(Class<T> type, T repository, boolean concurrency) {
        return mock(type, invocation -> {
            Object result = delegatesTo(repository).answer(invocation);
            if (invocation.getMethod().getName().equals("saveAllAndFlush")) {
                // The real insert and flush have completed: every preceding write must roll back.
                if (concurrency) throw new ConcurrencyFailureException("Concurrent replacement");
                throw new DataIntegrityViolationException("Conflicting replacement at flush");
            }
            return result;
        });
    }

    private void savePoints() {
        // Join the test transaction so delete/insert ordering is exercised as in the service's @Transactional method.
        new TransactionTemplate(transactionManager).executeWithoutResult(status ->
                assertThat(service.saveDriverTeamPoints(race.getId().intValue()).getStatusCode().value()).isEqualTo(200));
    }

    private void savePrices() {
        new TransactionTemplate(transactionManager).executeWithoutResult(status ->
                assertThat(service.saveDriverTeamPrices(race.getId().intValue()).getStatusCode().value()).isEqualTo(200));
    }

    private void assertDriverPoints(int firstPoints, int secondPoints) {
        assertThat(driverPoints.findByRaceId(race.getId().intValue()))
                .extracting(p -> p.getDriver().getId(), FantasyPointsDriver::getPoints)
                .containsExactlyInAnyOrder(tuple(first.getId(), firstPoints), tuple(second.getId(), secondPoints));
        assertThat(driverPoints.count()).isEqualTo(2);
    }

    private void assertTeamPoints(int points) {
        assertThat(teamPoints.findByRaceId(race.getId().intValue())).singleElement().satisfies(saved -> {
            assertThat(saved.getTeam().getId()).isEqualTo(team.getId());
            assertThat(saved.getPoints()).isEqualTo(points);
        });
        assertThat(teamPoints.count()).isEqualTo(1);
    }

    private void assertPrices(int firstPrice, int secondPrice, int teamPrice) {
        assertThat(driverPrices.findByRaceId(nextRace.getId().intValue()))
                .extracting(p -> p.getDriver().getId(), FantasyPriceDriver::getPrice)
                .containsExactlyInAnyOrder(tuple(first.getId(), firstPrice), tuple(second.getId(), secondPrice));
        assertThat(teamPrices.findByRaceId(nextRace.getId().intValue())).singleElement().satisfies(saved -> {
            assertThat(saved.getTeam().getId()).isEqualTo(team.getId());
            assertThat(saved.getPrice()).isEqualTo(teamPrice);
        });
        assertThat(driverPrices.count()).isEqualTo(4); // Two source prices and two next-race prices.
        assertThat(teamPrices.count()).isEqualTo(1);
    }

    private FantasyService createService(FantasyPointsDriverRepository pointsDrivers,
            FantasyPointsTeamRepository pointsTeams, FantasyPriceDriverRepository pricesDrivers,
            FantasyPriceTeamRepository pricesTeams) {
        return new FantasyService(accounts, races, results, elections, pricesDrivers, pricesTeams,
                pointsDrivers, pointsTeams, new FantasyElectionImpl(Mappers.getMapper(FantasyElectionMapper.class)),
                new FantasyPriceImpl(Mappers.getMapper(FantasyPriceMapper.class)),
                new AccountImpl(Mappers.getMapper(AccountMapper.class)),
                new DriverImpl(Mappers.getMapper(DriverMapper.class)),
                new TeamImpl(Mappers.getMapper(TeamMapper.class)), Clock.systemUTC());
    }

    private <T> T failingInserts(Class<T> type, T realRepository) {
        return mock(type, invocation -> {
            // Support both immediate inserts and save-and-flush implementations of the agreed fix.
            if (List.of("save", "saveAll", "saveAndFlush", "saveAllAndFlush")
                    .contains(invocation.getMethod().getName())) {
                throw new DataIntegrityViolationException("Simulated concurrent insert violates unique key");
            }
            return delegatesTo(realRepository).answer(invocation);
        });
    }

    private void flushAndClear() {
        em.flush();
        em.clear();
    }

    private <T> T persist(T entity) {
        em.persist(entity);
        return entity;
    }
}
