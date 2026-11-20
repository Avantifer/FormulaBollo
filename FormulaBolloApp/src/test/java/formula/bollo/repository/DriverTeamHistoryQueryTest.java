package formula.bollo.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.mapstruct.factory.Mappers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import formula.bollo.entity.Driver;
import formula.bollo.entity.Season;
import formula.bollo.entity.Team;
import formula.bollo.mapper.DriverMapper;
import jakarta.persistence.EntityManager;
import tools.jackson.databind.json.JsonMapper;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:driver-team-history;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
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
class DriverTeamHistoryQueryTest {
    @Autowired EntityManager em;
    @Autowired DriverRepository drivers;

    @Test
    void ordersBySeasonAndMapsDetachedHistoryWithExactlyOneSelect() {
        for (int number : List.of(3, 1, 2)) {
            Season season = new Season(null, "Season " + number, number, 2023 + number);
            em.persist(season);
            Team team = new Team(null, number == 1 ? "Williams" : "McLaren", "car.png", "logo.png", season);
            em.persist(team);
            em.persist(new Driver(null, "Driver With Spaces", 7, "driver.png", season, team));
            em.persist(new Driver(null, "Another Driver", 8, "other.png", season, team));
        }
        em.flush();
        em.clear();
        var statistics = em.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();
        statistics.clear();

        var loaded = drivers.findTeamHistoryByName("Driver With Spaces");
        em.clear(); // Mapping/serialization cannot rely on an open persistence context.
        var history = Mappers.getMapper(DriverMapper.class).convertDriversToTeamHistoryDTO(loaded);
        assertThat(history).extracting(entry -> entry.getSeason().getNumber()).containsExactly(1, 2, 3);
        assertThat(history).extracting(entry -> entry.getTeam().getName()).containsExactly("Williams", "McLaren", "McLaren");
        assertThat(JsonMapper.builder().build().writeValueAsString(history)).contains("Williams", "McLaren");
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
        assertThat(drivers.findTeamHistoryByName("Unknown")).isEmpty();
    }
}
