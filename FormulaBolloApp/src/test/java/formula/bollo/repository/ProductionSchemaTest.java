package formula.bollo.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDateTime;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.annotation.Rollback;

import formula.bollo.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.metamodel.EntityType;

/** Requires a disposable MariaDB schema loaded with production_schema.sql, V002 and V003. */
@EnabledIfEnvironmentVariable(named = "PRODUCTION_SCHEMA_JDBC_URL", matches = ".+")
@DataJpaTest(properties = {
        "spring.datasource.url=${PRODUCTION_SCHEMA_JDBC_URL}",
        "spring.datasource.username=${PRODUCTION_SCHEMA_USER:}",
        "spring.datasource.password=${PRODUCTION_SCHEMA_PASSWORD:}",
        "spring.datasource.driver-class-name=org.mariadb.jdbc.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.MariaDBDialect",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.jpa.generate-ddl=false",
        "spring.jpa.properties.jakarta.persistence.schema-generation.scripts.action=none",
        "spring.sql.init.mode=never",
        "spring.flyway.enabled=false",
        "spring.liquibase.enabled=false"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Execution(ExecutionMode.SAME_THREAD)
@Rollback
class ProductionSchemaTest {
    @Autowired EntityManager em;
    @Autowired ResultRepository results;
    @Autowired AccountRepository accounts;
    @Autowired FantasyPointsDriverRepository driverPoints;
    @Autowired RaceRepository races;

    @Test
    void allEntitiesCanBeSelectedFromProductionSchema() {
        assertThat(em.getMetamodel().getEntities()).isNotEmpty();
        for (EntityType<?> entity : em.getMetamodel().getEntities()) {
            em.createQuery("select e from " + entity.getName() + " e", entity.getJavaType())
                    .getResultList();
        }
    }

    @Test
    void seasonYearCacheVersionAndAccountAdminRoundTrip() {
        // JDBC tolerates cache.version SMALLINT vs Integer and season.year VARCHAR(4) vs int.
        String token = UUID.randomUUID().toString().replace("-", "");
        Season season = new Season(null, "Schema test", 1, 2026);
        Cache cache = new Cache(token.substring(0, 20), 123);
        Account account = new Account(null, token.substring(0, 25), "hash", 1,
                token + "@example.test");
        em.persist(season);
        em.persist(cache);
        em.persist(account);
        em.flush();
        em.clear();

        Season reloadedSeason = em.find(Season.class, season.getId());
        Cache reloadedCache = em.find(Cache.class, cache.getName());
        Account reloadedAccount = em.find(Account.class, account.getId());
        assertThat(reloadedSeason).isNotNull();
        assertThat(reloadedSeason.getYear()).isEqualTo(2026);
        assertThat(reloadedCache).isNotNull();
        assertThat(reloadedCache.getVersion()).isEqualTo(123);
        assertThat(reloadedAccount).isNotNull();
        assertThat(reloadedAccount.getAdmin()).isEqualTo(1);
    }

    @Test
    void duplicateResultForSameRaceAndDriverIsRejected() {
        // Optional season/team/position need no fixtures; all NOT NULL fields are supplied.
        Race race = new Race(null, "Schema test", "", "",
                LocalDateTime.of(2026, 1, 1, 12, 0), null, 0);
        Driver driver = new Driver(null, "Schema test", 1, null, null, null);
        em.persist(race);
        em.persist(driver);
        em.flush();
        results.saveAndFlush(new Result(null, race, driver, null, 0, 0));

        assertThrows(DataIntegrityViolationException.class,
                () -> results.saveAndFlush(new Result(null, race, driver, null, 1, 1)));
        // DataJpaTest rolls back this transaction, including the first result and fixtures.
    }

    @Test
    void duplicateAccountEmailIsRejected() {
        String token = UUID.randomUUID().toString().replace("-", "");
        String email = token + "@example.test";
        accounts.saveAndFlush(new Account(null, "a" + token.substring(0, 24), "hash", 0, email));

        // A different username and generated id rule out other unique constraints.
        assertThrows(DataIntegrityViolationException.class,
                () -> accounts.saveAndFlush(new Account(null, "b" + token.substring(0, 24),
                        "hash", 0, email)));
    }

    @Test
    void duplicateFantasyPointsForSameRaceAndDriverIsRejected() {
        Race race = new Race(null, "Fantasy test", "", "",
                LocalDateTime.of(2026, 1, 1, 12, 0), null, 0);
        Driver driver = new Driver(null, "Fantasy test", 1, null, null, null);
        em.persist(race);
        em.persist(driver);
        em.flush();
        driverPoints.saveAndFlush(new FantasyPointsDriver(null, driver, race, 10));

        assertThrows(DataIntegrityViolationException.class,
                () -> driverPoints.saveAndFlush(new FantasyPointsDriver(null, driver, race, 20)));
    }

    @Test
    void duplicateRaceNameInSameSeasonIsRejected() {
        Season season = new Season(null, "Race test", 1, 2026);
        em.persist(season);
        Race race = new Race(null, "Same name", "", "",
                LocalDateTime.of(2026, 1, 1, 12, 0), season, 0);
        races.saveAndFlush(race);

        assertThrows(DataIntegrityViolationException.class,
                () -> races.saveAndFlush(new Race(null, race.getName(), "", "",
                        race.getDateStart().plusDays(7), season, 0)));
    }
}
