package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertAll;
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
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.ValueSource;
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

    static Stream<Arguments> invalidScoringBatches() {
        return Stream.of(
                Arguments.of("repeated position id", (Consumer<List<ResultDTO>>) batch -> {
                    batch.get(0).setPosition(new PositionDTO(7L, 1, 25));
                    batch.get(2).setPosition(new PositionDTO(7L, 1, 25));
                }),
                Arguments.of("two poles including a DNF", (Consumer<List<ResultDTO>>) batch -> {
                    batch.get(0).setPole(1);
                    batch.get(2).setPole(1);
                }),
                Arguments.of("two fast laps including a DNF", (Consumer<List<ResultDTO>>) batch -> {
                    batch.get(0).setFastlap(1);
                    batch.get(2).setFastlap(1);
                }),
                Arguments.of("negative pole", (Consumer<List<ResultDTO>>) batch -> batch.get(2).setPole(-1)),
                Arguments.of("pole above one", (Consumer<List<ResultDTO>>) batch -> batch.get(2).setPole(2)),
                Arguments.of("negative fast lap", (Consumer<List<ResultDTO>>) batch -> batch.get(2).setFastlap(-1)),
                Arguments.of("fast lap above one", (Consumer<List<ResultDTO>>) batch -> batch.get(2).setFastlap(2)));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidScoringBatches")
    void invalidScoringBatchReturns400WithoutReplacingExistingResults(String reason,
            Consumer<List<ResultDTO>> invalidate) {
        List<ResultDTO> batch = List.of(result(1L), result(2L), result(3L));
        batch.get(0).setPosition(new PositionDTO(1L, 1, 25));
        batch.get(1).setPosition(new PositionDTO(2L, 2, 18));
        invalidate.accept(batch);
        when(results.findByRaceId(1)).thenReturn(List.of(new formula.bollo.entity.Result()));

        var response = resultService.saveResults(batch);

        assertAll(reason,
                () -> assertEquals(400, response.getStatusCode().value()),
                () -> verifyNoInteractions(results, resultImpl));
    }

    @Test
    void repeatedSprintPositionIdReturns400WithoutReplacingExistingSprints() {
        List<SprintDTO> batch = List.of(
                new SprintDTO(null, result(1L).getRace(), result(1L).getDriver(), new SprintPositionDTO(8L, 1, 8)),
                new SprintDTO(null, result(2L).getRace(), result(2L).getDriver(), null),
                new SprintDTO(null, result(3L).getRace(), result(3L).getDriver(), new SprintPositionDTO(8L, 1, 8)));
        when(sprints.findByRaceId(1)).thenReturn(List.of(new formula.bollo.entity.Sprint()));

        var response = sprintService.saveSprints(batch);

        assertAll(
                () -> assertEquals(400, response.getStatusCode().value()),
                () -> verifyNoInteractions(sprints, sprintImpl));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void fullResultBatchAcceptsDistinctPositionsAndMultipleDnfsWithPoleAndFastLap(boolean bonusOnDnf) {
        List<ResultDTO> batch = java.util.stream.LongStream.rangeClosed(1, 8)
                .mapToObj(ResultBatchValidationTest::result).toList();
        for (int i = 0; i < 6; i++)
            batch.get(i).setPosition(new PositionDTO((long) i + 10, i + 1, 25 - i));
        // Position identity is its database id, not the array index or driver id.
        batch.get(bonusOnDnf ? 6 : 0).setFastlap(1);
        batch.get(bonusOnDnf ? 7 : 0).setPole(1);
        List<formula.bollo.entity.Result> mapped = batch.stream()
                .map(dto -> new formula.bollo.entity.Result()).toList();
        when(resultImpl.convertResultsDTOToResults(batch)).thenReturn(mapped);

        assertEquals(200, resultService.saveResults(batch).getStatusCode().value());
        verify(results).saveAllAndFlush(mapped);
    }

    @Test
    void fullSprintBatchAcceptsDistinctPositionsAndMultipleDnfs() {
        List<SprintDTO> batch = java.util.stream.LongStream.rangeClosed(1, 8)
                .mapToObj(id -> new SprintDTO(null, result(id).getRace(), result(id).getDriver(),
                        id <= 6 ? new SprintPositionDTO(id + 10, (int) id, 9 - (int) id) : null)).toList();
        List<formula.bollo.entity.Sprint> mapped = batch.stream()
                .map(dto -> new formula.bollo.entity.Sprint()).toList();
        when(sprintImpl.convertSprintsDTOToSprints(batch)).thenReturn(mapped);

        assertEquals(200, sprintService.saveSprints(batch).getStatusCode().value());
        verify(sprints).saveAllAndFlush(mapped);
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
