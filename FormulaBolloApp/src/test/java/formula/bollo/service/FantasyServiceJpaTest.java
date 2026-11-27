package formula.bollo.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.LocalDateTime;

import org.hibernate.SessionFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.mapstruct.factory.Mappers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import formula.bollo.entity.*;
import formula.bollo.impl.*;
import formula.bollo.mapper.*;
import formula.bollo.model.*;
import formula.bollo.repository.*;
import jakarta.persistence.EntityManager;
import tools.jackson.databind.json.JsonMapper;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:fantasy-service;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.open-in-view=false",
        "spring.jpa.properties.hibernate.generate_statistics=true",
        "spring.sql.init.mode=never"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Execution(ExecutionMode.SAME_THREAD)
class FantasyServiceJpaTest {
    @Autowired EntityManager em;
    @Autowired AccountRepository accounts;
    @Autowired RaceRepository races;
    @Autowired ResultRepository results;
    @Autowired FantasyElectionRepository elections;
    @Autowired FantasyPriceDriverRepository driverPrices;
    @Autowired FantasyPriceTeamRepository teamPrices;
    @Autowired FantasyPointsDriverRepository driverPoints;
    @Autowired FantasyPointsTeamRepository teamPoints;

    FantasyService service;

    @BeforeEach
    void createService() {
        service = new FantasyService(accounts, races, results, elections, driverPrices, teamPrices,
                driverPoints, teamPoints, new FantasyElectionImpl(Mappers.getMapper(FantasyElectionMapper.class)),
                new FantasyPriceImpl(Mappers.getMapper(FantasyPriceMapper.class)),
                new AccountImpl(Mappers.getMapper(AccountMapper.class)),
                new DriverImpl(Mappers.getMapper(DriverMapper.class)), new TeamImpl(Mappers.getMapper(TeamMapper.class)),
                Clock.systemUTC());
    }

    @Test
    void clasificationIncludesCalendarAndCompletePublishedPicksInFourQueries() {
        Season season = persist(new Season(null, "Season", 3, 2026));
        Team first = persist(new Team(null, "First", "", "", season));
        Team second = persist(new Team(null, "Second", "", "", season));
        Team hidden = persist(new Team(null, "Hidden", "", "", season));
        Driver one = driver(season, first, "One");
        Driver two = driver(season, second, "Two");
        Driver missing = driver(season, first, "Missing points");
        Driver winner = driver(season, second, "Winner");
        Driver hiddenDriver = driver(season, hidden, "Hidden");
        Account ana = account("Ana");
        Account bob = account("Bob");
        // Insert out of calendar order; the two races on day 1 must use their IDs to break the tie.
        Race future = race(season, 4, 0);
        Race later = race(season, 3, 1);
        Race earlier = race(season, 1, 1);
        Race dateTie = persist(new Race(null, "Date tie", "", "", earlier.getDateStart(), season, 1));
        election(ana, earlier, missing, two, one, second, first);
        election(bob, earlier, winner, two, one, first, second);
        election(bob, later, one, two, missing, first, second);
        election(ana, later, one, two, missing, first, second);
        election(ana, future, hiddenDriver, two, one, hidden, first);
        election(account("Incomplete"), earlier, hiddenDriver, two, null, hidden, first);
        Season otherSeason = persist(new Season(null, "Other", 4, 2027));
        Race otherRace = race(otherSeason, 1, 1);
        election(ana, otherRace, hiddenDriver, two, one, hidden, first);
        persist(new FantasyPointsDriver(null, one, earlier, 10));
        persist(new FantasyPointsDriver(null, two, earlier, 4));
        persist(new FantasyPointsDriver(null, winner, earlier, 20));
        persist(new FantasyPointsTeam(null, first, earlier, 7));
        persist(new FantasyPointsTeam(null, second, earlier, 9));
        persist(new FantasyPointsDriver(null, one, otherRace, 999));
        persist(new FantasyPointsTeam(null, first, otherRace, 999));
        flushAndClear();
        var statistics = em.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();
        statistics.clear();

        FantasyClasificationDTO dataset = service.getFantasyClasification(3);

        assertThat(statistics.getPrepareStatementCount()).isEqualTo(4);
        assertThat(dataset.getSeason()).isEqualTo(3);
        assertThat(dataset.getRaces()).extracting(FantasyClasificationRaceDTO::getId)
                .containsExactly(earlier.getId(), dateTie.getId(), later.getId(), future.getId());
        assertThat(dataset.getRaces()).extracting(FantasyClasificationRaceDTO::getOrder).containsExactly(1, 2, 3, 4);
        assertThat(dataset.getRaces()).extracting(FantasyClasificationRaceDTO::isFinished)
                .containsExactly(true, true, true, false);
        assertThat(dataset.getEntries()).extracting(FantasyClasificationEntryDTO::getRaceId)
                .containsExactly(earlier.getId(), earlier.getId(), later.getId(), later.getId());
        assertThat(dataset.getEntries()).extracting(entry -> entry.getAccount().getUsername())
                .containsExactly("Bob", "Ana", "Ana", "Bob");
        assertThat(dataset.getEntries()).extracting(FantasyClasificationEntryDTO::getPoints).containsExactly(50, 30, 0, 0);
        var anaEntry = dataset.getEntries().get(1);
        assertThat(anaEntry.getDrivers()).extracting(FantasyClasificationDriverPickDTO::getDriverId)
                .containsExactly(missing.getId(), two.getId(), one.getId());
        assertThat(anaEntry.getDrivers()).extracting(FantasyClasificationDriverPickDTO::getPoints).containsExactly(0, 4, 10);
        assertThat(anaEntry.getTeams()).extracting(FantasyClasificationTeamPickDTO::getTeamId)
                .containsExactly(second.getId(), first.getId());
        assertThat(anaEntry.getTeams()).extracting(FantasyClasificationTeamPickDTO::getPoints).containsExactly(9, 7);
        assertThat(dataset.getEntries()).allSatisfy(entry -> {
            assertThat(entry.getDrivers()).hasSize(3);
            assertThat(entry.getTeams()).hasSize(2);
            assertThat(entry.getPoints()).isEqualTo(
                    entry.getDrivers().stream().mapToInt(FantasyClasificationDriverPickDTO::getPoints).sum()
                    + entry.getTeams().stream().mapToInt(FantasyClasificationTeamPickDTO::getPoints).sum());
        });
        assertThat(dataset.getDrivers()).extracting(DriverDTO::getId)
                .containsExactly(one.getId(), two.getId(), missing.getId(), winner.getId());
        assertThat(dataset.getTeams()).extracting(TeamDTO::getId).containsExactly(first.getId(), second.getId());
        assertThat(dataset.getDrivers().getFirst().getTeam().getSeason().getNumber()).isEqualTo(3);

        // More elections and races must not increase the number of statements.
        Race extraRace = race(season, 5, 1);
        election(account("Extra"), extraRace, one, two, missing, first, second);
        flushAndClear();
        statistics.clear();
        var larger = service.getFantasyClasification(3);
        assertThat(larger.getEntries()).hasSize(5);
        assertThat(larger.getRaces()).hasSize(5);
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(4);
        em.clear();
        assertThat(JsonMapper.builder().findAndAddModules().build().valueToTree(larger).get("entries").size())
                .isEqualTo(5);
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(4);
    }

    @Test
    void electionsWithAnyMissingPickAreOmitted() {
        Season season = persist(new Season(null, "Season", 3, 2026));
        Team team = persist(new Team(null, "Team", "", "", season));
        Driver one = driver(season, team, "One");
        Driver two = driver(season, team, "Two");
        Driver three = driver(season, team, "Three");
        Race race = race(season, 1, 1);
        election(account("MissingOne"), race, null, two, three, team, team);
        election(account("MissingTwo"), race, one, null, three, team, team);
        election(account("MissingThree"), race, one, two, null, team, team);
        election(account("MissingTeamOne"), race, one, two, three, null, team);
        election(account("MissingTeamTwo"), race, one, two, three, team, null);
        flushAndClear();

        var dataset = service.getFantasyClasification(3);

        assertThat(dataset.getRaces()).hasSize(1);
        assertThat(dataset.getEntries()).isEmpty();
        assertThat(dataset.getDrivers()).isEmpty();
        assertThat(dataset.getTeams()).isEmpty();
    }

    @Test
    void seasonWithoutElectionsKeepsItsCalendar() {
        Season season = persist(new Season(null, "Season", 3, 2026));
        Race finished = race(season, 1, 1);
        Race future = race(season, 2, 0);
        flushAndClear();

        var dataset = service.getFantasyClasification(3);

        assertThat(dataset.getRaces()).extracting(FantasyClasificationRaceDTO::getId)
                .containsExactly(finished.getId(), future.getId());
        assertThat(dataset.getEntries()).isEmpty();
        assertThat(dataset.getDrivers()).isEmpty();
        assertThat(dataset.getTeams()).isEmpty();
    }

    @Test
    void emptyDatabaseReturnsEmptyListsAndRequestedSeason() {
        assertEmpty(service.getFantasyClasification(27), 27);
    }

    @Test
    void seasonWithoutRacesAndUnknownSeasonReturnEmptyLists() {
        persist(new Season(null, "Season", 3, 2026));
        flushAndClear();
        assertEmpty(service.getFantasyClasification(3), 3);
        assertEmpty(service.getFantasyClasification(99), 99);
    }

    @Test
    void unfinishedCalendarDoesNotExposeElections() {
        Season season = persist(new Season(null, "Season", 3, 2026));
        Team team = persist(new Team(null, "Team", "", "", season));
        Driver driver = driver(season, team, "Driver");
        Race race = race(season, 1, 0);
        election(account("Ana"), race, driver, driver, driver, team, team);
        flushAndClear();

        var dataset = service.getFantasyClasification(3);

        assertThat(dataset.getRaces()).singleElement().satisfies(r -> assertThat(r.isFinished()).isFalse());
        assertThat(dataset.getEntries()).isEmpty();
        assertThat(dataset.getDrivers()).isEmpty();
        assertThat(dataset.getTeams()).isEmpty();
    }

    private void assertEmpty(FantasyClasificationDTO dataset, int season) {
        assertThat(dataset.getSeason()).isEqualTo(season);
        assertThat(dataset.getRaces()).isEmpty();
        assertThat(dataset.getDrivers()).isEmpty();
        assertThat(dataset.getTeams()).isEmpty();
        assertThat(dataset.getEntries()).isEmpty();
    }

    private Driver driver(Season season, Team team, String name) {
        return persist(new Driver(null, name, 1, "", season, team));
    }

    private Account account(String username) {
        return persist(new Account(null, username, "test-password", 0, username + "@example.test"));
    }

    private Race race(Season season, int day, int finished) {
        return persist(new Race(null, "Race " + day, "", "", LocalDateTime.of(2026, 1, day, 12, 0), season, finished));
    }

    private void election(Account account, Race race, Driver one, Driver two, Driver three, Team first, Team second) {
        persist(new FantasyElection(null, account, one, two, three, first, second, race));
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
