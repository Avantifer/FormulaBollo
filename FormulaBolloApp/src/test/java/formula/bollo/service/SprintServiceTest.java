package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

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

        ResponseEntity<String> response = sprintService.saveSprints(Arrays.asList(sprintDTO));

        assertEquals("Resultados de la sprint guardados correctamente", response.getBody());
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

        ResponseEntity<String> response = sprintService.saveSprints(Arrays.asList(sprintDTO));

        assertEquals("Resultados de la sprint guardados correctamente", response.getBody());
    }
}
