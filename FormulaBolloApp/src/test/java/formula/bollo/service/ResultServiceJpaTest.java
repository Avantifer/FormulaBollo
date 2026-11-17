package formula.bollo.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.mapstruct.factory.Mappers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

import formula.bollo.entity.*;
import formula.bollo.impl.DriverImpl;
import formula.bollo.impl.ResultImpl;
import formula.bollo.mapper.DriverMapper;
import formula.bollo.mapper.ResultMapper;
import formula.bollo.model.*;
import formula.bollo.repository.ResultRepository;
import jakarta.persistence.EntityManager;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:result-service;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({ResultService.class, ResultImpl.class, DriverImpl.class, ResultServiceJpaTest.MappersConfig.class})
@Execution(ExecutionMode.SAME_THREAD)
class ResultServiceJpaTest {
    @TestConfiguration
    static class MappersConfig {
        @Bean ResultMapper resultMapper() { return Mappers.getMapper(ResultMapper.class); }
        @Bean DriverMapper driverMapper() { return Mappers.getMapper(DriverMapper.class); }
    }

    @Autowired EntityManager em;
    @Autowired ResultService service;
    @Autowired ResultRepository results;

    @Test
    void savingTheSameBatchTwiceLeavesOneRowPerDriver() {
        Season season = persist(new Season(null, "Season", 1, 2026));
        Team team = persist(new Team(null, "Team", "", "", season));
        Driver first = persist(new Driver(null, "Ana", 1, "", season, team));
        Driver second = persist(new Driver(null, "Bea", 2, "", season, team));
        Race race = persist(new Race(null, "GP", "", "", LocalDateTime.of(2026, 1, 1, 12, 0), season, 1));
        Position position = persist(new Position(null, 1, 25));
        em.flush();
        SeasonDTO seasonDTO = new SeasonDTO(season.getId(), season.getName(), season.getNumber(), "2026");
        RaceDTO raceDTO = new RaceDTO(race.getId(), race.getName(), "", "", race.getDateStart(), seasonDTO, 1);
        PositionDTO positionDTO = new PositionDTO(position.getId(), 1, 25);
        List<ResultDTO> batch = List.of(
                new ResultDTO(null, raceDTO, new DriverDTO(first.getId(), "Ana", 1, "", seasonDTO, null), positionDTO, 1, 1),
                new ResultDTO(null, raceDTO, new DriverDTO(second.getId(), "Bea", 2, "", seasonDTO, null), null, 0, 0));

        assertThat(service.saveResults(batch).getStatusCode().value()).isEqualTo(200);
        em.clear();
        List<Result> initial = results.findByRaceId(race.getId().intValue());
        List<Long> initialIds = initial.stream().map(Result::getId).toList();
        // The client may resubmit IDs returned by the previous save.
        for (ResultDTO result : batch) {
            result.setId(initial.stream().filter(r -> r.getDriver().getId().equals(result.getDriver().getId()))
                    .findFirst().orElseThrow().getId());
        }

        assertThat(service.saveResults(batch).getStatusCode().value()).isEqualTo(200);
        em.clear();

        List<Result> saved = results.findByRaceId(race.getId().intValue());
        assertThat(results.count()).isEqualTo(2);
        assertThat(saved).extracting(r -> r.getDriver().getId()).containsExactlyInAnyOrder(first.getId(), second.getId());
        assertThat(saved).extracting(Result::getId).doesNotContainAnyElementsOf(initialIds);
        assertThat(saved).filteredOn(r -> r.getDriver().getId().equals(first.getId())).singleElement().satisfies(r -> {
            assertThat(r.getPosition().getId()).isEqualTo(position.getId());
            assertThat(r.getFastlap()).isEqualTo(1);
            assertThat(r.getPole()).isEqualTo(1);
        });
    }

    private <T> T persist(T entity) {
        em.persist(entity);
        return entity;
    }
}
