package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import formula.bollo.entity.Driver;
import formula.bollo.entity.Position;
import formula.bollo.entity.Race;
import formula.bollo.entity.Result;
import formula.bollo.entity.Season;
import formula.bollo.entity.Sprint;
import formula.bollo.entity.SprintPosition;
import formula.bollo.entity.Team;
import formula.bollo.enums.PositionChange;
import formula.bollo.impl.DriverImpl;
import formula.bollo.impl.ResultImpl;
import formula.bollo.model.DriverDTO;
import formula.bollo.model.DriverPointsDTO;
import formula.bollo.model.PositionDTO;
import formula.bollo.model.RaceDTO;
import formula.bollo.model.ResultDTO;
import formula.bollo.model.ResultTeamDTO;
import formula.bollo.model.SeasonDTO;
import formula.bollo.model.TeamDTO;
import formula.bollo.repository.ResultRepository;
import formula.bollo.repository.SprintRepository;

@ExtendWith(MockitoExtension.class)
class ResultServiceTest {

    @InjectMocks
    private ResultService resultService;

    @Mock
    private DriverImpl driverImpl;

    @Mock
    private ResultImpl resultImpl;

    @Mock
    private ResultRepository resultRepository;

    @Mock
    private SprintRepository sprintRepository;

    @Test
    void setTotalPointsByDriverNoSprints() {
        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Avantifer", 2, "", seasonDTO, teamDTO);
        DriverDTO driverDTO2 = new DriverDTO(2L, "Avantifer", 2, "", seasonDTO, teamDTO);

        Map<DriverDTO, Integer> map = new HashMap<>();
        map.put(driverDTO, 20);
        map.put(driverDTO2, 30);

        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Result result = new Result(1L, race, driver, null, 0, 0);

        when(driverImpl.driverToDriverDTO(any())).thenReturn(driverDTO);

        List<DriverPointsDTO> resultList = resultService.setTotalPointsByDriver(Arrays.asList(result),
                Collections.emptyList(), map);

        assertEquals(1, resultList.size());
    }

    @Test
    void setTotalPointsByDriver() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Position position = new Position(1L, 1, 25);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        Result result = new Result(1L, race, driver, position, 1, 1);
        Result result2 = new Result(2L, race, driver, null, 0, 0);

        SprintPosition sprintPosition = new SprintPosition(1L, 1, 8);

        Sprint sprint = new Sprint(1L, race, driver, sprintPosition);
        Sprint sprint2 = new Sprint(2L, race, driver, null);

        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Avantifer", 2, "", seasonDTO, teamDTO);

        when(driverImpl.driverToDriverDTO(any())).thenReturn(driverDTO);

        List<DriverPointsDTO> driverPointsDTOs = resultService.setTotalPointsByDriver(Arrays.asList(result, result2),
                Arrays.asList(sprint, sprint2), new HashMap<>());

        assertEquals(1, driverPointsDTOs.size());
    }

    @Test
    void getTotalResultsPerDriverResultsEmpty() {
        List<DriverPointsDTO> driverPointsDTOs = resultService.getTotalResultsPerDriver(0, 10);
        assertEquals(0, driverPointsDTOs.size());
    }

    @Test
    void getTotalResultsPerDriverResultsAll() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Position position = new Position(1L, 1, 25);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        Result result = new Result(1L, race, driver, position, 1, 1);

        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Avantifer", 2, "", seasonDTO, teamDTO);

        when(driverImpl.driverToDriverDTO(any())).thenReturn(driverDTO);
        when(resultRepository.findAll()).thenReturn(Arrays.asList(result));

        List<DriverPointsDTO> driverPointsDTOs = resultService.getTotalResultsPerDriver(0, 10);

        assertEquals(1, driverPointsDTOs.size());
    }

    @Test
    void getTotalResultsPerDriver() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Team team2 = new Team(2L, "Red Bull", "", "", season);

        Driver driver1 = new Driver(1L, "Avantifer", 2, "", season, team);
        Driver driver2 = new Driver(2L, "Bubapu", 5, "", season, team2);

        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);
        Position position = new Position(1L, 1, 25);

        Result result1 = new Result(1L, race, driver1, position, 0, 0);
        Result result2 = new Result(2L, race, driver2, position, 0, 0);

        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        TeamDTO teamDTO2 = new TeamDTO(2L, "Red Bull", "", "", seasonDTO);

        DriverDTO driverDTO1 = new DriverDTO(1L, "Avantifer", 2, "", seasonDTO, teamDTO);
        DriverDTO driverDTO2 = new DriverDTO(2L, "Bubapu", 5, "", seasonDTO, teamDTO2);

        when(driverImpl.driverToDriverDTO(any())).thenReturn(driverDTO1).thenReturn(driverDTO2);
        when(resultRepository.findBySeason(anyInt())).thenReturn(Arrays.asList(result1, result2));
        when(sprintRepository.findBySeason(anyInt())).thenReturn(Collections.emptyList());

        List<DriverPointsDTO> result = resultService.getTotalResultsPerDriver(2, 1);

        assertEquals(1, result.size());
    }

    @Test
    void getTotalResultsSpecificPerDriverEmpty() {
        List<DriverPointsDTO> driverPointsDTOs = resultService.getTotalResultsSpecificPerDriver(0,
                Arrays.asList(1L, 2L));

        assertEquals(0, driverPointsDTOs.size());
    }

    @Test
    void getTotalResultsSpecificPerDriver() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Team team2 = new Team(2L, "Ferrari", "", "", season);

        Driver driver1 = new Driver(1L, "Bubapu", 55, "", season, team);
        Driver driver2 = new Driver(2L, "Fernando", 14, "", season, team2);
        Position position = new Position(1L, 1, 25);

        Race race = new Race(1L, "España", "", "", LocalDateTime.now(), season, 0);
        Result result1 = new Result(1L, race, driver1, position, 0, 0);
        Result result2 = new Result(2L, race, driver2, position, 0, 0);

        Sprint sprint = new Sprint(1L, race, driver1, new SprintPosition(1L, 1, 8));
        Sprint sprint2 = new Sprint(2L, race, driver2, new SprintPosition(2L, 1, 6));

        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        TeamDTO teamDTO2 = new TeamDTO(2L, "Ferrari", "", "", seasonDTO);

        DriverDTO driverDTO1 = new DriverDTO(1L, "Bubapu", 55, "", seasonDTO, teamDTO);
        DriverDTO driverDTO2 = new DriverDTO(2L, "Fernando", 14, "", seasonDTO, teamDTO2);

        when(driverImpl.driverToDriverDTO(any())).thenReturn(driverDTO1).thenReturn(driverDTO2).thenReturn(driverDTO1)
                .thenReturn(driverDTO2);
        when(resultRepository.findBySeasonAndDrivers(eq(2), any())).thenReturn(List.of(result1, result2));
        when(sprintRepository.findBySeasonAndDrivers(eq(2), any())).thenReturn(List.of(sprint, sprint2));

        List<DriverPointsDTO> result = resultService.getTotalResultsSpecificPerDriver(2, List.of(1L, 2L));

        assertEquals(2, result.size());
    }

    @Test
    void getTotalResultsSpecificPerDriverSameDriverName() {
        DriverDTO driverDTO1 = mock(DriverDTO.class);
        when(driverDTO1.getName()).thenReturn("Avantifer");

        DriverDTO driverDTO2 = mock(DriverDTO.class);
        when(driverDTO2.getName()).thenReturn("Avantifer");

        DriverPointsDTO dp1 = new DriverPointsDTO(driverDTO1, 30);
        DriverPointsDTO dp2 = new DriverPointsDTO(driverDTO2, 20);

        ResultService spyService = Mockito.spy(resultService);
        doReturn(List.of(dp1, dp2)).when(spyService).setTotalPointsByDriver(any(), any(), any());

        Result dummyResult = new Result();
        dummyResult.setRace(new Race(1L, "Test", "", "", LocalDateTime.now(), new Season(), 0));
        when(resultRepository.findBySeasonAndDrivers(anyInt(), any())).thenReturn(List.of(dummyResult));
        when(sprintRepository.findBySeasonAndDrivers(anyInt(), any())).thenReturn(Collections.emptyList());

        List<DriverPointsDTO> result = spyService.getTotalResultsSpecificPerDriver(2, List.of(1L, 2L));

        assertEquals(1, result.size());
    }

    @Test
    void orderResultsByPoints() {
        PositionDTO pos1 = new PositionDTO(1L, 1, 25);
        PositionDTO pos2 = new PositionDTO(2L, 2, 18);

        ResultDTO result1 = new ResultDTO();
        result1.setPosition(pos1);
        ResultDTO result2 = new ResultDTO();
        result2.setPosition(pos2);
        ResultDTO result3 = new ResultDTO();

        List<ResultDTO> input = new ArrayList<>(List.of(result1, result2, result3));

        List<ResultDTO> resultDTOs = resultService.orderResultsByPoints(input);

        assertNull(resultDTOs.get(2).getPosition());
    }

    @Test
    void orderResultsByPointsByTeams() {
        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO team1 = new TeamDTO(1L, "Ferrari", "", "", seasonDTO);
        TeamDTO team2 = new TeamDTO(2L, "Red Bull", "", "", seasonDTO);

        DriverDTO driver1 = new DriverDTO(1L, "Avantifer", 0, "", seasonDTO, team1);
        DriverDTO driver2 = new DriverDTO(2L, "Bubapu", 0, "", seasonDTO, team2);

        RaceDTO race = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), null, 0);
        PositionDTO pos1 = new PositionDTO(1L, 1, 25);
        PositionDTO pos2 = new PositionDTO(2L, 2, 18);

        ResultDTO result1 = new ResultDTO(1L, race, driver1, pos1, 1, 1);
        ResultDTO result2 = new ResultDTO(2L, race, driver2, pos2, 0, 1);
        ResultDTO result3 = new ResultDTO(3L, race, driver1, null, 0, 0);

        List<ResultTeamDTO> result = resultService.orderResultsByPointsByTeams(List.of(result1, result2, result3));

        assertEquals(2, result.size());
    }

    @Test
    void saveResultsEmpty() {
        ResponseEntity<String> response = resultService.saveResults(Collections.emptyList());
        assertEquals("No hay resultados", response.getBody());
    }

    @Test
    void saveResults() {
        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO team = new TeamDTO(1L, "Ferrari", "", "", seasonDTO);
        DriverDTO driver = new DriverDTO(1L, "Avantifer", 0, "", seasonDTO, team);
        RaceDTO race = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), null, 0);
        PositionDTO pos = new PositionDTO(1L, 1, 25);

        ResultDTO result = new ResultDTO(1L, race, driver, pos, 1, 1);

        List<Result> existing = List.of(new Result());

        when(resultRepository.findByRaceId(1)).thenReturn(existing);
        when(resultImpl.convertResultsDTOToResults(any())).thenReturn(List.of(new Result()));

        ResponseEntity<String> response = resultService.saveResults(List.of(result));

        assertEquals("Resultados guardados correctamente", response.getBody());
    }

    @Test
    void getOverallPositionChanges() {
        Season season = new Season(1L, "Temporada 1", 1, 2024);
        Race race = new Race(1L, "España", "", "", LocalDateTime.now(), season, 0);
        Team team = new Team(1L, "Haas", "", "", season);

        Driver driver = new Driver(1L, "Avantifer", 14, "", season, team);
        Driver driver1 = new Driver(2L, "Bubapu", 33, "", season, team);
        Driver driver2 = new Driver(3L, "AlbertoMD", 44, "", season, team);

        SeasonDTO seasonDTO = new SeasonDTO(1L, "Temporada 1", 1, "2024");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Avantifer", 14, "", seasonDTO, teamDTO);
        DriverDTO driverDTO1 = new DriverDTO(2L, "Bubapu", 33, "", seasonDTO, teamDTO);
        DriverDTO driverDTO2 = new DriverDTO(3L, "AlbertoMD", 44, "", seasonDTO, teamDTO);

        Position position = new Position(1L, 1, 25);
        Position position2 = new Position(2L, 2, 18);

        Result result = new Result(1L, race, driver, position, 1, 0);
        Result result1 = new Result(2L, race, driver1, position2, 0, 0);
        Result result2 = new Result(3L, race, driver2, null, 0, 0);

        SprintPosition sprintPosition = new SprintPosition(1L, 1, 8);
        Sprint sprint = new Sprint(1L, race, driver1, sprintPosition);
        Sprint sprint1 = new Sprint(2L, race, driver2, null);

        when(resultRepository.findByRaceId(1)).thenReturn(List.of(result, result1, result2));
        when(sprintRepository.findByRaceId(1)).thenReturn(List.of(sprint, sprint1));

        DriverPointsDTO driverPointsDTO = new DriverPointsDTO(driverDTO, 20);
        DriverPointsDTO driverPointsDTO2 = new DriverPointsDTO(driverDTO1, 35);
        DriverPointsDTO driverPointsDTO3 = new DriverPointsDTO(driverDTO2, 5);

        List<DriverPointsDTO> list = new ArrayList<>(List.of(driverPointsDTO, driverPointsDTO2, driverPointsDTO3));

        resultService.getOverallPositionChanges(list, 1);

        assertEquals(2, driverPointsDTO.getPositionChangeAmount());
        assertEquals(1, driverPointsDTO2.getPositionChangeAmount());
        assertEquals(1, driverPointsDTO3.getPositionChangeAmount());
    }

    @Test
    void getOverallPositionChangesSame() {
        Season season = new Season(1L, "Temporada 1", 1, 2024);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);
        Team team = new Team(1L, "Haas", "", "", season);
        Position position = new Position(1L, 1, 25);
        Driver driver = new Driver(1L, "Avantifer", 14, "", season, team);

        SeasonDTO seasonDTO = new SeasonDTO(1L, "Temporada 1", 1, "2024");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Avantifer", 14, "", seasonDTO, teamDTO);

        Result result = new Result(1L, race, driver, position, 0, 0);

        when(resultRepository.findByRaceId(1)).thenReturn(List.of(result));
        when(sprintRepository.findByRaceId(1)).thenReturn(Collections.emptyList());

        DriverPointsDTO dp = new DriverPointsDTO(driverDTO, 25);
        List<DriverPointsDTO> list = List.of(dp);

        resultService.getOverallPositionChanges(list, 1);

        assertEquals(PositionChange.SAME, dp.getPositionChange());
    }
}
