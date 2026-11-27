package formula.bollo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalDateTime;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import formula.bollo.entity.Race;
import formula.bollo.entity.Season;
import formula.bollo.impl.RaceImpl;
import formula.bollo.impl.SeasonImpl;
import formula.bollo.mapper.RaceMapper;
import formula.bollo.mapper.SeasonMapper;
import formula.bollo.model.RaceDTO;
import formula.bollo.model.SeasonDTO;
import formula.bollo.repository.RaceRepository;
import formula.bollo.repository.SeasonRepository;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:race-save-regression;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({RaceService.class, RaceImpl.class, SeasonImpl.class, RaceSaveRegressionJpaTest.MappersConfig.class})
@Execution(ExecutionMode.SAME_THREAD)
// Let each service call commit or roll back before checking persisted state, especially after a conflict.
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class RaceSaveRegressionJpaTest {
    @TestConfiguration
    static class MappersConfig {
        @Bean RaceMapper raceMapper() { return Mappers.getMapper(RaceMapper.class); }
        @Bean SeasonMapper seasonMapper() { return Mappers.getMapper(SeasonMapper.class); }
    }

    @Autowired RaceService service;
    @Autowired RaceRepository races;
    @Autowired SeasonRepository seasons;
    @Autowired PlatformTransactionManager transactionManager;

    Season season;
    Race first;
    Race second;

    @BeforeEach
    void seed() {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            season = seasons.save(new Season(null, "Season", 1, 2026));
            first = races.save(new Race(null, "Race A", "a-flag", "a-circuit",
                    LocalDateTime.of(2026, 1, 1, 12, 0), season, 0));
            second = races.save(new Race(null, "Race B", "b-flag", "b-circuit",
                    first.getDateStart().plusDays(7), season, 0));
        });
    }

    @AfterEach
    void cleanCommittedFixtures() {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            races.deleteAllInBatch();
            seasons.deleteAllInBatch();
        });
    }

    @Test
    void existingIdRenamesThatRaceWithoutCreatingAnother() {
        RaceDTO input = input(first.getId(), "Renamed A");

        assertThat(service.saveRace(input).getStatusCode().value()).isEqualTo(200);

        Race saved = races.findById(first.getId()).orElseThrow();
        assertThat(saved.getName()).isEqualTo("Renamed A");
        assertThat(saved.getFlagImage()).isEqualTo(input.getFlagImage());
        assertThat(saved.getCircuitImage()).isEqualTo(input.getCircuitImage());
        assertThat(saved.getDateStart()).isEqualTo(input.getDateStart());
        assertThat(saved.getFinished()).isEqualTo(input.getFinished());
        assertThat(races.findAll()).extracting(Race::getId)
                .containsExactlyInAnyOrder(first.getId(), second.getId());
        assertUnchanged(second);
    }

    @Test
    void renamingBToAsNameReturns409AndLeavesBothRacesUnchanged() {
        // Different payload fields expose the current bug that overwrites A instead of renaming B.
        RaceDTO input = input(second.getId(), first.getName());

        assertAll(
                () -> {
                    ResponseStatusException error = assertThrows(ResponseStatusException.class,
                            () -> service.saveRace(input));
                    assertThat(error.getStatusCode().value()).isEqualTo(409);
                },
                () -> assertUnchanged(first),
                () -> assertUnchanged(second),
                () -> assertThat(races.count()).isEqualTo(2));
    }

    @Test
    void unknownIdReturns404WithoutUpdatingRaceWithMatchingName() {
        long unknownId = Math.max(first.getId(), second.getId()) + 1000;
        assertThat(races.existsById(unknownId)).isFalse();

        assertAll(
                () -> {
                    ResponseStatusException error = assertThrows(ResponseStatusException.class,
                            () -> service.saveRace(input(unknownId, first.getName())));
                    assertThat(error.getStatusCode().value()).isEqualTo(404);
                },
                () -> assertUnchanged(first),
                () -> assertUnchanged(second),
                () -> assertThat(races.count()).isEqualTo(2));
    }

    @Test
    void nullIdCreatesNewRace() {
        RaceDTO input = input(null, "Race C");

        assertThat(service.saveRace(input).getStatusCode().value()).isEqualTo(200);

        Race saved = races.findByNameAndSeason("Race C", season.getNumber()).orElseThrow();
        assertThat(saved.getId()).isNotNull().isNotIn(first.getId(), second.getId());
        assertThat(saved.getFlagImage()).isEqualTo(input.getFlagImage());
        assertThat(saved.getCircuitImage()).isEqualTo(input.getCircuitImage());
        assertThat(saved.getDateStart()).isEqualTo(input.getDateStart());
        assertThat(saved.getFinished()).isEqualTo(input.getFinished());
        assertThat(saved.getSeason().getId()).isEqualTo(season.getId());
        assertThat(races.count()).isEqualTo(3);
        assertUnchanged(first);
        assertUnchanged(second);
    }

    @Test
    void nullIdWithExistingNameReturns409WithoutOverwritingExistingRace() {
        assertAll(
                () -> {
                    ResponseStatusException error = assertThrows(ResponseStatusException.class,
                            () -> service.saveRace(input(null, first.getName())));
                    assertThat(error.getStatusCode().value()).isEqualTo(409);
                },
                () -> assertUnchanged(first),
                () -> assertThat(races.count()).isEqualTo(2));
    }

    private RaceDTO input(Long id, String name) {
        return new RaceDTO(id, name, "new-flag", "new-circuit",
                LocalDateTime.of(2026, 2, 1, 14, 0),
                new SeasonDTO(season.getId(), season.getName(), season.getNumber(), "2026"), 1);
    }

    private void assertUnchanged(Race expected) {
        Race actual = races.findById(expected.getId()).orElseThrow();
        assertThat(actual.getName()).isEqualTo(expected.getName());
        assertThat(actual.getFlagImage()).isEqualTo(expected.getFlagImage());
        assertThat(actual.getCircuitImage()).isEqualTo(expected.getCircuitImage());
        assertThat(actual.getDateStart()).isEqualTo(expected.getDateStart());
        assertThat(actual.getFinished()).isEqualTo(expected.getFinished());
        assertThat(actual.getSeason().getId()).isEqualTo(expected.getSeason().getId());
    }
}
