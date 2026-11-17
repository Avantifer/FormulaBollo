package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.server.ResponseStatusException;

import formula.bollo.entity.Driver;
import formula.bollo.entity.Race;
import formula.bollo.entity.Season;
import formula.bollo.entity.Sprint;
import formula.bollo.entity.SprintPosition;
import formula.bollo.entity.Team;
import formula.bollo.impl.SprintImpl;
import formula.bollo.model.DriverDTO;
import formula.bollo.model.RaceDTO;
import formula.bollo.model.SeasonDTO;
import formula.bollo.model.SprintDTO;
import formula.bollo.model.SprintPositionDTO;
import formula.bollo.model.TeamDTO;
import formula.bollo.repository.SprintRepository;

@ExtendWith(MockitoExtension.class)
class SprintServiceTest {

    @InjectMocks
    private SprintService sprintService;

    @Mock
    private SprintRepository sprintRepository;

    @Mock
    private SprintImpl sprintImpl;

    @Test
    void orderSprintsByPoints() {
        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Avantifer", 2, "", seasonDTO, teamDTO);
        RaceDTO raceDTO = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), seasonDTO, 0);
        SprintPositionDTO sprintPositionDTO = new SprintPositionDTO(1L, 1, 8);

        SprintDTO sprintDTO = new SprintDTO(1L, raceDTO, driverDTO, sprintPositionDTO);
        SprintDTO sprintDTO2 = new SprintDTO(1L, raceDTO, driverDTO, null);

        List<SprintDTO> sprintDTOs = sprintService.orderSprintsByPoints(Arrays.asList(sprintDTO, sprintDTO2));

        assertEquals(2, sprintDTOs.size());
    }

    @Test
    void saveSprints() {
        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Avantifer", 2, "", seasonDTO, teamDTO);
        RaceDTO raceDTO = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), seasonDTO, 0);
        SprintPositionDTO sprintPositionDTO = new SprintPositionDTO(1L, 1, 8);

        SprintDTO sprintDTO = new SprintDTO(1L, raceDTO, driverDTO, sprintPositionDTO);

        Sprint mapped = new Sprint();
        when(sprintImpl.convertSprintsDTOToSprints(List.of(sprintDTO))).thenReturn(List.of(mapped));
        ResponseEntity<String> response = sprintService.saveSprints(Arrays.asList(sprintDTO));

        assertEquals("Resultados de la sprint guardados correctamente", response.getBody());
        verify(sprintRepository).saveAllAndFlush(List.of(mapped));
    }

    @Test
    void saveSprintsExisting() {
        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Avantifer", 2, "", seasonDTO, teamDTO);
        RaceDTO raceDTO = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), seasonDTO, 0);
        SprintPositionDTO sprintPositionDTO = new SprintPositionDTO(1L, 1, 8);

        SprintDTO sprintDTO = new SprintDTO(1L, raceDTO, driverDTO, sprintPositionDTO);

        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);
        SprintPosition sprintPosition = new SprintPosition(1L, 1, 8);

        Sprint sprint = new Sprint(1L, race, driver, sprintPosition);

        when(sprintRepository.findByRaceId(anyInt())).thenReturn(Arrays.asList(sprint));
        Sprint mapped = new Sprint(99L, race, driver, sprintPosition);
        when(sprintImpl.convertSprintsDTOToSprints(List.of(sprintDTO))).thenReturn(List.of(mapped));

        ResponseEntity<String> response = sprintService.saveSprints(Arrays.asList(sprintDTO));

        assertEquals("Resultados de la sprint guardados correctamente", response.getBody());
        assertNull(mapped.getId());
        var writes = inOrder(sprintRepository);
        writes.verify(sprintRepository).deleteAll(List.of(sprint));
        writes.verify(sprintRepository).flush();
        writes.verify(sprintRepository).saveAllAndFlush(List.of(mapped));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void saveSprintsTranslatesPersistenceConflicts(boolean concurrencyFailure) {
        List<SprintDTO> batch = validSprintBatch();
        List<Sprint> mapped = List.of(new Sprint());
        when(sprintImpl.convertSprintsDTOToSprints(batch)).thenReturn(mapped);
        RuntimeException failure = concurrencyFailure
                ? new ConcurrencyFailureException("SQL deadlock details")
                : new DataIntegrityViolationException("SQL constraint details");
        when(sprintRepository.saveAllAndFlush(mapped)).thenThrow(failure);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> sprintService.saveSprints(batch));

        assertEquals(409, error.getStatusCode().value());
        assertEquals("Otro guardado simultáneo ha modificado esta carrera. Vuelve a intentarlo", error.getReason());
        verify(sprintRepository).saveAllAndFlush(mapped);
    }

    @Test
    void saveSprintsPropagatesUnrelatedFailures() {
        List<SprintDTO> batch = validSprintBatch();
        List<Sprint> mapped = List.of(new Sprint());
        when(sprintImpl.convertSprintsDTOToSprints(batch)).thenReturn(mapped);
        RuntimeException failure = new IllegalStateException("unexpected");
        when(sprintRepository.saveAllAndFlush(mapped)).thenThrow(failure);

        assertSame(failure, assertThrows(RuntimeException.class, () -> sprintService.saveSprints(batch)));
    }

    private List<SprintDTO> validSprintBatch() {
        SeasonDTO season = new SeasonDTO(2L, "Season", 2, "2026");
        RaceDTO race = new RaceDTO(5L, "GP", "", "", LocalDateTime.of(2026, 1, 1, 12, 0), season, 1);
        DriverDTO driver = new DriverDTO(1L, "Ana", 1, "", season, null);
        return List.of(new SprintDTO(null, race, driver, null));
    }
}
