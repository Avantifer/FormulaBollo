package formula.bollo.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDateTime;
import java.util.List;

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
        "spring.datasource.url=jdbc:h2:mem:unique-constraints;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Execution(ExecutionMode.SAME_THREAD)
class UniqueConstraintsTest {
    @Autowired EntityManager em;
    @Autowired ResultRepository results;
    @Autowired SprintRepository sprints;
    @Autowired FantasyElectionRepository elections;

    Race race;
    Race otherRace;
    Driver driver;
    Driver otherDriver;
    Account account;
    Account otherAccount;

    @BeforeEach
    void seed() {
        Season season = persist(new Season(null, "Season", 1, 2026));
        Team team = persist(new Team(null, "Team", "", "", season));
        race = persist(new Race(null, "First", "", "", LocalDateTime.of(2026, 1, 1, 12, 0), season, 1));
        otherRace = persist(new Race(null, "Second", "", "", race.getDateStart().plusDays(7), season, 1));
        driver = persist(new Driver(null, "Ana", 1, "", season, team));
        otherDriver = persist(new Driver(null, "Bea", 2, "", season, team));
        account = persist(new Account(null, "ana", "hash", 0, "ana@example.com"));
        otherAccount = persist(new Account(null, "bea", "hash", 0, "bea@example.com"));
        em.flush();
    }

    private <T> T persist(T entity) {
        em.persist(entity);
        return entity;
    }

    @Test
    void duplicateResultForRaceAndDriverIsRejected() {
        results.saveAndFlush(new Result(null, race, driver, null, 0, 0));
        assertThrows(DataIntegrityViolationException.class,
                () -> results.saveAndFlush(new Result(null, race, driver, null, 1, 1)));
    }

    @Test
    void resultsAllowDifferentDriversOrRaces() {
        results.saveAllAndFlush(List.of(new Result(null, race, driver, null, 0, 0),
                new Result(null, race, otherDriver, null, 0, 0),
                new Result(null, otherRace, driver, null, 0, 0)));
        em.clear();
        assertThat(results.count()).isEqualTo(3);
    }

    @Test
    void duplicateSprintForRaceAndDriverIsRejected() {
        sprints.saveAndFlush(new Sprint(null, race, driver, null));
        assertThrows(DataIntegrityViolationException.class,
                () -> sprints.saveAndFlush(new Sprint(null, race, driver, null)));
    }

    @Test
    void sprintsAllowDifferentDriversOrRaces() {
        sprints.saveAllAndFlush(List.of(new Sprint(null, race, driver, null),
                new Sprint(null, race, otherDriver, null), new Sprint(null, otherRace, driver, null)));
        em.clear();
        assertThat(sprints.count()).isEqualTo(3);
    }

    @Test
    void duplicateElectionForAccountAndRaceIsRejected() {
        elections.saveAndFlush(election(account, race, driver));
        assertThrows(DataIntegrityViolationException.class,
                () -> elections.saveAndFlush(election(account, race, otherDriver)));
    }

    @Test
    void electionsAllowDifferentAccountsOrRaces() {
        elections.saveAllAndFlush(List.of(election(account, race, driver),
                election(otherAccount, race, driver), election(account, otherRace, driver)));
        em.clear();
        assertThat(elections.count()).isEqualTo(3);
    }

    private FantasyElection election(Account owner, Race selectedRace, Driver selectedDriver) {
        return new FantasyElection(null, owner, selectedDriver, selectedDriver, selectedDriver,
                selectedDriver.getTeam(), selectedDriver.getTeam(), selectedRace);
    }
}
