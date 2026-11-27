package formula.bollo.repository;

import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;

import formula.bollo.entity.*;
import jakarta.persistence.EntityManager;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:fantasy-race-unique;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Execution(ExecutionMode.SAME_THREAD)
class FantasyAndRaceUniqueConstraintsTest {
    @Autowired EntityManager em;
    @Autowired FantasyPointsDriverRepository driverPoints;
    @Autowired FantasyPointsTeamRepository teamPoints;
    @Autowired FantasyPriceDriverRepository driverPrices;
    @Autowired FantasyPriceTeamRepository teamPrices;
    @Autowired RaceRepository races;

    Season season;
    Team team;
    Driver driver;
    Race race;

    @BeforeEach
    void seed() {
        season = new Season(null, "Season", 1, 2026);
        em.persist(season);
        team = new Team(null, "Team", "", "", season);
        em.persist(team);
        driver = new Driver(null, "Ana", 1, "", season, team);
        em.persist(driver);
        race = new Race(null, "GP", "", "", LocalDateTime.of(2026, 1, 1, 12, 0), season, 1);
        races.saveAndFlush(race);
    }

    @Test
    void duplicateDriverPointsForRaceAndDriverAreRejected() {
        driverPoints.saveAndFlush(new FantasyPointsDriver(null, driver, race, 10));
        assertThrows(DataIntegrityViolationException.class,
                () -> driverPoints.saveAndFlush(new FantasyPointsDriver(null, driver, race, 20)));
    }

    @Test
    void duplicateTeamPointsForRaceAndTeamAreRejected() {
        teamPoints.saveAndFlush(new FantasyPointsTeam(null, team, race, 10));
        assertThrows(DataIntegrityViolationException.class,
                () -> teamPoints.saveAndFlush(new FantasyPointsTeam(null, team, race, 20)));
    }

    @Test
    void duplicateDriverPricesForRaceAndDriverAreRejected() {
        driverPrices.saveAndFlush(new FantasyPriceDriver(null, driver, race, 10_000_000));
        assertThrows(DataIntegrityViolationException.class,
                () -> driverPrices.saveAndFlush(new FantasyPriceDriver(null, driver, race, 20_000_000)));
    }

    @Test
    void duplicateTeamPricesForRaceAndTeamAreRejected() {
        teamPrices.saveAndFlush(new FantasyPriceTeam(null, team, race, 10_000_000));
        assertThrows(DataIntegrityViolationException.class,
                () -> teamPrices.saveAndFlush(new FantasyPriceTeam(null, team, race, 20_000_000)));
    }

    @Test
    void duplicateRaceNameWithinSeasonIsRejected() {
        assertThrows(DataIntegrityViolationException.class,
                () -> races.saveAndFlush(new Race(null, race.getName(), "", "",
                        race.getDateStart().plusDays(7), season, 0)));
    }
}
