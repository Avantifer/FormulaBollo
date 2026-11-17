package formula.bollo.repository;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import formula.bollo.entity.Configuration;
import formula.bollo.entity.Season;
import jakarta.persistence.EntityManager;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:configuration-queries;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Execution(ExecutionMode.SAME_THREAD)
class ConfigurationRepositoryTest {
    @Autowired EntityManager em;
    @Autowired ConfigurationRepository configurations;

    Configuration firstSeasonFirst;
    Configuration secondSeasonFirst;
    Configuration firstSeasonSecond;
    Configuration secondSeasonSecond;
    Configuration withoutSeason;

    @BeforeEach
    void seed() {
        // Season numbers deliberately differ from their generated IDs.
        em.persist(new Season(null, "Season 3", 3, 2027));
        Season first = new Season(null, "Season 1", 1, 2025);
        Season second = new Season(null, "Season 2", 2, 2026);
        em.persist(first);
        em.persist(second);
        firstSeasonFirst = configuration("Z setting", "Short", first);
        secondSeasonFirst = configuration("Z setting", "Long", second);
        firstSeasonSecond = configuration("A setting", "25%", first);
        secondSeasonSecond = configuration("A setting", "50%", second);
        withoutSeason = configuration("Legacy setting", "Legacy value", null);
        em.flush();
        em.clear();
    }

    private Configuration configuration(String setting, String value, Season season) {
        Configuration configuration = new Configuration();
        configuration.setSetting(setting);
        configuration.setSettingValue(value);
        configuration.setSeason(season);
        em.persist(configuration);
        return configuration;
    }

    @Test
    void findBySeasonFiltersByNumberAndOrdersById() {
        assertThat(configurations.findBySeason(1)).extracting(Configuration::getId)
                .containsExactly(firstSeasonFirst.getId(), firstSeasonSecond.getId());
        assertThat(configurations.findBySeason(2)).extracting(Configuration::getId)
                .containsExactly(secondSeasonFirst.getId(), secondSeasonSecond.getId());
    }

    @Test
    void seasonWithoutConfigurationsReturnsEmptyList() {
        assertThat(configurations.findBySeason(3)).isEmpty();
    }

    @Test
    void findAllIncludesEverySeasonAndLegacyConfigurationsInIdOrder() {
        assertThat(configurations.findAll()).extracting(Configuration::getId)
                .containsExactly(firstSeasonFirst.getId(), secondSeasonFirst.getId(),
                        firstSeasonSecond.getId(), secondSeasonSecond.getId(), withoutSeason.getId());
    }
}
