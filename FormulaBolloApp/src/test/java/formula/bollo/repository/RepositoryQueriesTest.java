package formula.bollo.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.mapstruct.factory.Mappers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import formula.bollo.controller.RaceController;
import formula.bollo.entity.*;
import formula.bollo.impl.RaceImpl;
import formula.bollo.mapper.RaceMapper;
import formula.bollo.model.RaceDTO;
import formula.bollo.model.RecordDTO;
import jakarta.persistence.EntityManager;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:repository-queries;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Execution(ExecutionMode.SAME_THREAD)
class RepositoryQueriesTest {
    @Autowired EntityManager em;
    @Autowired ResultRepository results;
    @Autowired RaceRepository races;
    @Autowired DriverRepository drivers;
    @Autowired TeamRepository teams;
    @Autowired PenaltyRepository penalties;
    @Autowired FantasyElectionRepository elections;
    @Autowired FantasyPointsDriverRepository driverPoints;
    @Autowired FantasyPointsTeamRepository teamPoints;
    @Autowired FantasyPriceDriverRepository driverPrices;
    @Autowired FantasyPriceTeamRepository teamPrices;

    Season current;
    Season previous;
    Team team;
    Driver driver;
    Race latest;
    Race earlier;
    Race next;
    Race oldNext;
    Result latestResult;
    Result earlierResult;
    Result retiredResult;
    Penalty penalty;
    PenaltySeverity severity;
    FantasyElection election;
    Account account;

    @BeforeEach
    void seed() {
        previous = persist(new Season(null, "Season 1", 1, 2025));
        current = persist(new Season(null, "Season 2", 2, 2026));
        Team oldTeam = persist(new Team(null, "Bollo", null, null, previous));
        team = persist(new Team(null, "Bollo", null, null, current));
        Driver oldDriver = persist(new Driver(null, "Ana", 1, null, previous, oldTeam));
        driver = persist(new Driver(null, "Ana", 1, null, current, team));
        // Insert in a different order from dates: ordering by generated id would be wrong.
        latest = race("Latest", current, "2026-03-01T12:00:00", 1);
        earlier = race("Earlier", current, "2026-01-01T12:00:00", 1);
        next = race("Next", current, "2026-04-01T12:00:00", 0);
        race("Later", current, "2026-05-01T12:00:00", 0);
        Race oldRace = race("Old", previous, "2025-06-01T12:00:00", 1);
        oldNext = race("Old next", previous, "2025-07-01T12:00:00", 0);
        Race retired = race("Retired", current, "2026-02-01T12:00:00", 1);
        Position winner = persist(new Position(null, 1, 25));
        Position second = persist(new Position(null, 2, 18));
        Position fourth = persist(new Position(null, 4, 12));
        latestResult = persist(new Result(null, latest, driver, winner, 1, 1));
        earlierResult = persist(new Result(null, earlier, driver, second, 0, 0));
        retiredResult = persist(new Result(null, retired, driver, null, 0, 0));
        persist(new Result(null, oldRace, oldDriver, fourth, 0, 0));
        severity = persist(new PenaltySeverity(null, "Low"));
        penalty = persist(new Penalty(null, latest, driver, "Track limits", severity, current));
        persist(new Penalty(null, oldRace, oldDriver, "Contact", severity, previous));
        account = persist(new Account(null, "ana", "hash", 0, "ana@example.com"));
        election = persist(new FantasyElection(null, account, driver, driver, driver, team, team, latest));
        persist(new FantasyElection(null, account, oldDriver, oldDriver, oldDriver, oldTeam, oldTeam, oldRace));
    }

    private <T> T persist(T entity) {
        em.persist(entity);
        return entity;
    }

    private Race race(String name, Season season, String date, int finished) {
        return persist(new Race(null, name, "flag.png", "circuit.png", LocalDateTime.parse(date), season, finished));
    }

    private int id(Long value) { return Math.toIntExact(value); }

    @Test
    void raceQueriesFilterBySeasonAndOrderByDate() {
        assertThat(races.findByNameAndSeason("Latest", 2)).contains(latest);
        assertThat(races.findByNameAndSeason("Latest", 1)).isEmpty();
        assertThat(races.findBySeason(2)).hasSize(5).allMatch(r -> r.getSeason().getNumber() == 2);
        assertThat(races.findAllFinished(2)).extracting(Race::getName).containsExactly("Earlier", "Retired", "Latest");
        assertThat(races.findActual()).contains(oldNext);
        assertThat(races.findActualBySeason(2)).contains(next);

        var controller = new RaceController(races, new RaceImpl(Mappers.getMapper(RaceMapper.class)), null);
        assertThat(controller.getAllFinishedAndActual(2)).extracting(RaceDTO::getName)
                .containsExactly("Earlier", "Retired", "Latest", "Next");
    }

    @Test
    void driverAndTeamQueriesRespectNamesIdsAndSeasons() {
        assertThat(drivers.findBySeason(2)).containsExactly(driver);
        assertThat(drivers.findAllBySeason(2)).containsExactly(driver);
        assertThat(drivers.findByTeamId(team.getId())).containsExactly(driver);
        assertThat(drivers.findByTeamName("Bollo")).hasSize(2);
        assertThat(drivers.findByTeamNameAndSeason(2, "Bollo")).containsExactly(driver);
        assertThat(drivers.findByName("Ana")).hasSize(2);
        assertThat(drivers.findByNameAndSeason(2, "Ana")).containsExactly(driver);
        assertThat(teams.findBySeason(2)).containsExactly(team);
        assertThat(teams.findByName("Bollo")).hasSize(2);
        assertThat(teams.findByNameAndSeason(2, "Bollo")).containsExactly(team);
    }

    @Test
    void resultFiltersFetchesAndDeletionUseThePersistedRows() {
        List<Long> driverIds = List.of(driver.getId());
        List<Long> teamIds = List.of(team.getId());
        assertThat(results.findBySeason(2)).containsExactlyInAnyOrder(latestResult, earlierResult, retiredResult);
        assertThat(results.findBySeasonAndDrivers(2, driverIds)).hasSize(3);
        assertThat(results.findBySeasonAndDrivers(1, driverIds)).isEmpty();
        assertThat(results.findByRaceId(id(latest.getId()))).containsExactly(latestResult);
        assertThat(results.findByDriverIds(driverIds)).hasSize(3);
        assertThat(results.findByTeamIds(teamIds)).hasSize(3);
        em.flush();
        em.clear();
        assertThat(results.findWithRaceAndPositionByDriverIds(driverIds)).hasSize(3).allSatisfy(result -> {
            assertThat(em.getEntityManagerFactory().getPersistenceUnitUtil().isLoaded(result, "race")).isTrue();
            assertThat(em.getEntityManagerFactory().getPersistenceUnitUtil().isLoaded(result, "position")).isTrue();
        });
        results.deleteByRaceId(id(latest.getId()));
        assertThat(results.findByRaceId(id(latest.getId()))).isEmpty();
        assertThat(results.findByRaceId(id(earlier.getId()))).hasSize(1);
    }

    @Test
    void latestTeamResultsOrderByRaceDateAndExcludeRacesWithOnlyRetirements() {
        assertThat(results.last5ResultsByTeamIds(List.of(team.getId())))
                .extracting(result -> result.getRace().getName()).containsExactly("Latest", "Earlier");
    }

    @Test
    void resultRecordQueriesReturnRealCountsAndPercentages() {
        assertRecord(results.recordPoleDriver(), 1);
        assertRecord(results.recordPodiumsDriver(), 2);
        assertRecord(results.recordFastlapDriver(), 1);
        assertRecord(results.recordVictoriesDriver(), 1);
        assertRecord(results.recordPorcentageVictoriesDriver(), 50);
        assertRecord(results.recordRacesFinishedDriver(), 2);
    }

    private void assertRecord(List<RecordDTO> records, double value) {
        assertThat(records).isNotEmpty();
        assertThat(records.getFirst().getDriver().getId()).isEqualTo(driver.getId());
        assertThat(records.getFirst().getValue().doubleValue()).isEqualTo(value);
    }

    @Test
    void penaltyQueriesFilterAndCountTheMatchingDrivers() {
        assertThat(penalties.findByDriverIds(List.of(driver.getId()))).isEqualTo(1);
        assertThat(penalties.countByDriver(List.of(driver.getId()))).singleElement().satisfies(row -> {
            assertThat(row[0]).isEqualTo(driver.getId());
            assertThat(((Number) row[1]).longValue()).isEqualTo(1);
        });
        assertThat(penalties.findByRaceId(latest.getId())).containsExactly(penalty);
        assertThat(penalties.findBySeason(2)).containsExactly(penalty);
        assertThat(penalties.findByDriverAndRaceAndSeverity(id(driver.getId()), id(latest.getId()), id(severity.getId()), 2))
                .containsExactly(penalty);
        assertThat(penalties.findByDriverAndRaceAndSeverity(id(driver.getId()), id(latest.getId()), id(severity.getId()), 1))
                .isEmpty();
        assertThat(penalties.recordPenaltiesDriver()).hasSize(2)
                .allSatisfy(record -> assertThat(record.getValue().longValue()).isEqualTo(1));
        assertThat(penalties.findByDriverAndRace(id(driver.getId()), id(latest.getId()))).containsExactly(penalty);
    }

    @Test
    void fantasyElectionQueriesSelectOnlyTheRequestedAccountAndRace() {
        assertThat(elections.findByUserIdAndRaceId(id(account.getId()), id(latest.getId()))).contains(election);
        assertThat(elections.findByUserIdAndRaceId(id(account.getId()), id(next.getId()))).isEmpty();
        assertThat(elections.findByRaceId(id(latest.getId()))).containsExactly(election);
    }

    @Test
    void fantasyPointsQueriesFilterByRaceDriverAndTeam() {
        FantasyPointsDriver latestDriver = persist(new FantasyPointsDriver(null, driver, latest, 31));
        persist(new FantasyPointsDriver(null, driver, earlier, 12));
        FantasyPointsTeam latestTeam = persist(new FantasyPointsTeam(null, team, latest, 45));
        persist(new FantasyPointsTeam(null, team, earlier, 20));
        assertThat(driverPoints.findByRaceId(id(latest.getId()))).containsExactly(latestDriver)
                .extracting(FantasyPointsDriver::getPoints).containsExactly(31);
        assertThat(driverPoints.findByRaceId(id(next.getId()))).isEmpty();
        assertThat(driverPoints.findByDriverId(id(driver.getId()))).hasSize(2);
        assertThat(driverPoints.findByDriverIds(List.of(driver.getId()))).hasSize(2);
        assertThat(driverPoints.findByDriverIdAndRaceId(id(driver.getId()), id(latest.getId()))).contains(latestDriver);
        assertThat(teamPoints.findByRaceId(id(latest.getId()))).containsExactly(latestTeam)
                .extracting(FantasyPointsTeam::getPoints).containsExactly(45);
        assertThat(teamPoints.findByRaceId(id(next.getId()))).isEmpty();
        assertThat(teamPoints.findByTeamId(id(team.getId()))).hasSize(2);
        assertThat(teamPoints.findByTeamIds(List.of(team.getId()))).hasSize(2);
        assertThat(teamPoints.findByTeamIdAndRaceId(id(team.getId()), id(latest.getId()))).contains(latestTeam);
    }

    @Test
    void fantasyPriceQueriesFilterByRaceAndOrderTheirHistories() {
        FantasyPriceDriver latestDriver = persist(new FantasyPriceDriver(null, driver, latest, 150));
        FantasyPriceDriver earlierDriver = persist(new FantasyPriceDriver(null, driver, earlier, 120));
        FantasyPriceTeam latestTeam = persist(new FantasyPriceTeam(null, team, latest, 250));
        FantasyPriceTeam earlierTeam = persist(new FantasyPriceTeam(null, team, earlier, 220));
        assertThat(driverPrices.findByRaceId(id(latest.getId()))).containsExactly(latestDriver)
                .extracting(FantasyPriceDriver::getPrice).containsExactly(150);
        assertThat(driverPrices.findByRaceId(id(next.getId()))).isEmpty();
        assertThat(driverPrices.findTwoLastPrices(id(driver.getId()))).containsExactly(earlierDriver, latestDriver);
        assertThat(driverPrices.findByDriverId(id(driver.getId()))).containsExactlyInAnyOrder(latestDriver, earlierDriver);
        assertThat(driverPrices.findTwoLastPricesForAllDrivers(List.of(driver.getId()))).containsExactly(latestDriver, earlierDriver);
        assertThat(teamPrices.findByRaceId(id(latest.getId()))).containsExactly(latestTeam)
                .extracting(FantasyPriceTeam::getPrice).containsExactly(250);
        assertThat(teamPrices.findByRaceId(id(next.getId()))).isEmpty();
        assertThat(teamPrices.findByTeamId(id(team.getId()))).containsExactlyInAnyOrder(latestTeam, earlierTeam);
        assertThat(teamPrices.findTwoLastPricesForAllTeams(List.of(team.getId()))).containsExactly(latestTeam, earlierTeam);
    }
}
