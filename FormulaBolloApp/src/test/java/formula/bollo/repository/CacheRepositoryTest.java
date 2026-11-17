package formula.bollo.repository;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import formula.bollo.entity.Cache;
import jakarta.persistence.EntityManager;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:cache-version;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Execution(ExecutionMode.SAME_THREAD)
class CacheRepositoryTest {
    @Autowired EntityManager em;
    @Autowired CacheRepository caches;

    @Test
    void consecutiveIncrementsOnlyChangeTheRequestedRow() {
        caches.saveAndFlush(new Cache("general_cache", 7));
        caches.saveAndFlush(new Cache("other_cache", 20));

        assertThat(caches.incrementVersion("general_cache")).isEqualTo(1);
        assertThat(caches.incrementVersion("general_cache")).isEqualTo(1);
        em.clear(); // JPQL bulk updates bypass the persistence context.

        assertThat(caches.findById("general_cache")).get().extracting(Cache::getVersion).isEqualTo(9);
        assertThat(caches.findById("other_cache")).get().extracting(Cache::getVersion).isEqualTo(20);
        assertThat(caches.count()).isEqualTo(2);
    }

    @Test
    void missingRowReturnsZeroWithoutCreatingIt() {
        assertThat(caches.incrementVersion("general_cache")).isZero();
        assertThat(caches.findById("general_cache")).isEmpty();
    }
}
