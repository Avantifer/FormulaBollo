package formula.bollo.repository;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import formula.bollo.entity.Configuration;
import jakarta.persistence.EntityManager;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:configuration-repository;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ConfigurationRepositoryTest {
    @Autowired EntityManager em;
    @Autowired ConfigurationRepository configurations;

    @Test
    void findAllOrdersByIdRegardlessOfInsertionOrder() {
        em.createNativeQuery("""
                INSERT INTO configuration (id, setting, setting_value) VALUES
                (30, 'third', '30'), (10, 'first', '10'), (20, 'second', NULL)
                """).executeUpdate();
        em.clear();

        assertThat(configurations.findAll()).extracting(Configuration::getId)
                .containsExactly(10L, 20L, 30L);
    }

    @Test
    void configurationHasOnlyGlobalSettingColumnsAndAttributes() {
        assertThat(em.createNativeQuery("""
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'CONFIGURATION'
                """, String.class).getResultList())
                .containsExactlyInAnyOrder("ID", "SETTING", "SETTING_VALUE");
        assertThat(em.getMetamodel().entity(Configuration.class).getAttributes())
                .extracting(attribute -> attribute.getName())
                .containsExactlyInAnyOrder("id", "setting", "settingValue");
    }
}
