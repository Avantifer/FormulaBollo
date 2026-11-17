package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.web.server.ResponseStatusException;

import formula.bollo.impl.DriverImpl;
import formula.bollo.impl.ResultImpl;
import formula.bollo.impl.SprintImpl;
import formula.bollo.model.*;
import formula.bollo.repository.ResultRepository;
import formula.bollo.repository.SprintRepository;

class ResultBatchValidationTest {
    private final ResultRepository results = mock(ResultRepository.class);
    private final SprintRepository sprints = mock(SprintRepository.class);
    private final ResultImpl resultImpl = mock(ResultImpl.class);
    private final SprintImpl sprintImpl = mock(SprintImpl.class);
    private final ResultService resultService = new ResultService(results, sprints, resultImpl, mock(DriverImpl.class));
    private final SprintService sprintService = new SprintService(sprints, sprintImpl);

    static Stream<Consumer<ResultDTO>> invalidEntries() {
        return Stream.of(
                result -> result.setRace(null),
                result -> result.getRace().setId(null),
                result -> result.getRace().setSeason(null),
                result -> result.setDriver(null),
                result -> result.getDriver().setId(null),
                result -> result.getDriver().setSeason(null),
                result -> result.getDriver().getSeason().setId(9L),
                result -> result.getRace().setId(9L),
                result -> result.getRace().getSeason().setId(9L),
                result -> result.getDriver().setId(1L),
                result -> result.setPosition(new PositionDTO()));
    }

    private static ResultDTO result(long driverId) {
        SeasonDTO season = new SeasonDTO(1L, "Season", 1, "2026");
        RaceDTO race = new RaceDTO(1L, "Race", "", "", LocalDateTime.now(), season, 1);
        DriverDTO driver = new DriverDTO(driverId, "Driver", 1, "", new SeasonDTO(1L, "Season", 1, "2026"), null);
        return new ResultDTO(null, race, driver, null, 0, 0);
    }

    @ParameterizedTest
    @MethodSource("invalidEntries")
    void invalidSecondResultDoesNotReadDeleteOrSave(Consumer<ResultDTO> invalidate) {
        ResultDTO invalid = result(2L);
        invalidate.accept(invalid);
        assertEquals(400, resultService.saveResults(List.of(result(1L), invalid)).getStatusCode().value());
        verifyNoInteractions(results, resultImpl);
    }

    @ParameterizedTest
    @MethodSource("invalidEntries")
    void invalidSecondSprintDoesNotReadDeleteOrSave(Consumer<ResultDTO> invalidate) {
        ResultDTO invalid = result(2L);
        invalidate.accept(invalid);
        SprintDTO valid = new SprintDTO(null, result(1L).getRace(), result(1L).getDriver(), null);
        SprintDTO invalidSprint = new SprintDTO(null, invalid.getRace(), invalid.getDriver(),
                invalid.getPosition() == null ? null : new SprintPositionDTO());
        assertEquals(400, sprintService.saveSprints(List.of(valid, invalidSprint)).getStatusCode().value());
        verifyNoInteractions(sprints, sprintImpl);
    }

    @Test
    void nullEmptyAndNullElementsAreBadRequestsWithoutPersistence() {
        for (List<ResultDTO> batch : Arrays.asList(null, List.<ResultDTO>of(), Arrays.asList(result(1L), null))) {
            assertEquals(400, resultService.saveResults(batch).getStatusCode().value());
        }
        for (List<SprintDTO> batch : Arrays.asList(null, List.<SprintDTO>of(), Arrays.<SprintDTO>asList((SprintDTO) null))) {
            assertEquals(400, sprintService.saveSprints(batch).getStatusCode().value());
        }
        verifyNoInteractions(results, sprints, resultImpl, sprintImpl);
    }

    @Test
    void negativeResultLimitIsBadRequestBeforeReadingResults() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> resultService.getTotalResultsPerDriver(0, -1));
        assertEquals(400, error.getStatusCode().value());
        verifyNoInteractions(results, sprints);
    }
}
