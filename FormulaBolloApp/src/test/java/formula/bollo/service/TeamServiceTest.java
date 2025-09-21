package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import formula.bollo.entity.*;
import formula.bollo.enums.PositionChange;
import formula.bollo.impl.*;
import formula.bollo.model.*;
import formula.bollo.repository.*;

@ExtendWith(MockitoExtension.class)
class TeamServiceTest {

    @InjectMocks
    private TeamService teamService;

    @Mock
    private ResultRepository resultRepository;
    @Mock
    private SprintRepository sprintRepository;
    @Mock
    private DriverRepository driverRepository;
    @Mock
    private ConstructorRepository constructorRepository;
    @Mock
    private TeamImpl teamImpl;
    @Mock
    private DriverImpl driverImpl;
    @Mock
    private ResultImpl resultImpl;
    @Mock
    private RaceImpl raceImpl;
    @Mock
    private DriverService driverService;

    @Test
    void getTeamWithDriversDTO_ShouldReturnCorrectPoints() {
        Season season = new Season(1L, "Temp", 1, 2024);
        Team team = new Team(1L, "Team A", "", "", season);
        Driver driver = new Driver(1L, "Driver A", 33, "", season, team);
        Driver driver2 = new Driver(2L, "Driver B", 44, "", season, team);
        List<Driver> drivers = List.of(driver, driver2);

        Result result = new Result(1L, new Race(1L, "Carrera", "", "", LocalDateTime.now(), season, 0), driver,
                new Position(1L, 1, 25), 1, 0);
        Sprint sprint = new Sprint(1L, result.getRace(), driver, new SprintPosition(1L, 1, 8));

        Result result2 = new Result(2L, result.getRace(), driver2, new Position(2L, 2, 18), 0, 0);
        Sprint sprint2 = new Sprint(2L, result.getRace(), driver2, new SprintPosition(2L, 2, 6));

        when(resultRepository.findByDriverIds(anyList())).thenReturn(List.of(result, result2));
        when(sprintRepository.findByDriverIds(anyList())).thenReturn(List.of(sprint, sprint2));

        when(teamImpl.teamToTeamDTO(any())).thenReturn(new TeamDTO(1L, "Team A", "", "", null));
        when(driverImpl.driverToDriverDTO(driver)).thenReturn(new DriverDTO(1L, "Driver A", 33, "", null, null));
        when(driverImpl.driverToDriverDTO(driver2)).thenReturn(new DriverDTO(2L, "Driver B", 44, "", null, null));

        List<TeamWithDriversDTO> response = teamService.getTeamWithDriversDTO(drivers);

        assertEquals(1, response.size());
        TeamWithDriversDTO teamDTO = response.get(0);
        assertEquals(58, teamDTO.getTotalPoints());
    }

    @Test
    void getAllInfoTeam_ShouldReturnWithDrivers() {
        Season season = new Season(1L, "Temp", 1, 2024);
        Team team = new Team(1L, "Ferrari", "", "", season);
        Driver driver = new Driver(1L, "Carlos", 55, "", season, team);
        Result result = new Result(1L, new Race(1L, "Carrera", "", "", LocalDateTime.now(), season, 0), driver,
                new Position(1L, 1, 25), 1, 1);

        when(driverRepository.findByTeamId(1L)).thenReturn(List.of(driver));
        when(teamImpl.teamToTeamDTO(team)).thenReturn(new TeamDTO(1L, "Ferrari", "", "", null));
        when(constructorRepository.findByTeamId(List.of(1L))).thenReturn(2);
        when(driverService.getAllInfoDriver(List.of(driver)))
                .thenReturn(new DriverInfoDTO(null, 0, 0, 0, 100, 1, 1, 0, 0, 0, 0, null));

        ResultDTO resultDTO = new ResultDTO();
        resultDTO.setRace(new RaceDTO(1L, "Carrera", "", "", LocalDateTime.now(), null, 0));
        resultDTO.setPosition(new PositionDTO(1L, 1, 25));
        resultDTO.setFastlap(1);
        resultDTO.setPole(1);

        when(resultRepository.last5ResultsByTeamIds(anyList())).thenReturn(List.of(result));
        when(resultImpl.convertResultsToResultsDTO(anyList())).thenReturn(List.of(resultDTO));

        TeamInfoDTO info = teamService.getAllInfoTeam(List.of(team));

        assertNotNull(info);
        assertEquals("Ferrari", info.getTeam().getName());
        assertEquals(100, info.getTotalPoints());
        assertEquals(0, info.getFastlaps());
    }

    @Test
    void getAllInfoTeam_EmptyDrivers_ShouldReturnWithoutDriverInfo() {
        Team team = new Team(1L, "Red Bull", "", "", null);

        when(teamImpl.teamToTeamDTO(team)).thenReturn(new TeamDTO(1L, "Red Bull", "", "", null));
        when(constructorRepository.findByTeamId(List.of(1L))).thenReturn(1);
        when(driverRepository.findByTeamId(1L)).thenReturn(Collections.emptyList());
        when(driverService.getAllInfoDriver(Collections.emptyList())).thenReturn(null);

        TeamInfoDTO info = teamService.getAllInfoTeam(List.of(team));

        assertNotNull(info);
        assertEquals("Red Bull", info.getTeam().getName());
        assertEquals(1, info.getConstructors());
    }

    @Test
    void getOverallTeamPositionChanges_ShouldSetCorrectPositionChange() {
        Season season = new Season(1L, "Temp", 1, 2024);
        Team team = new Team(1L, "Team A", "", "", season);
        Driver driver = new Driver(1L, "Driver A", 1, "", season, team);
        Result result = new Result(1L, new Race(1L, "Carrera", "", "", LocalDateTime.now(), season, 0), driver,
                new Position(1L, 1, 25), 1, 0);

        Sprint sprint = new Sprint(1L, result.getRace(), driver, new SprintPosition(1L, 1, 8));

        TeamDTO teamDTO = new TeamDTO(1L, "Team A", "", "", null);
        DriverDTO driverDTO = new DriverDTO(1L, "Driver A", 1, "", null, teamDTO);
        DriverPointsDTO dp = new DriverPointsDTO(driverDTO, 33);

        TeamWithDriversDTO current = new TeamWithDriversDTO(teamDTO, dp, null, 33, null, 0);

        when(resultRepository.findByRaceId(1)).thenReturn(List.of(result));
        when(sprintRepository.findByRaceId(1)).thenReturn(List.of(sprint));

        List<TeamWithDriversDTO> currentRanking = new ArrayList<>();
        currentRanking.add(current);

        teamService.getOverallTeamPositionChanges(currentRanking, 1);

        assertEquals(PositionChange.SAME, current.getPositionChange());
        assertEquals(0, current.getPositionChangeAmount());
    }

    @Test
    void sumDuplicates_ShouldMergeCorrectly() {
        TeamDTO team1 = new TeamDTO(1L, "Ferrari", "", "", null);
        TeamDTO team2 = new TeamDTO(2L, "Ferrari", "", "", null);

        TeamInfoDTO info1 = new TeamInfoDTO(team1, 1, new DriverInfoDTO(), List.of());
        info1.setTotalPoints(100);
        info1.setPoles(1);

        TeamInfoDTO info2 = new TeamInfoDTO(team2, 2, new DriverInfoDTO(), List.of());
        info2.setTotalPoints(200);
        info2.setPoles(2);

        List<TeamInfoDTO> response = teamService.sumDuplicates(List.of(info1, info2));

        assertEquals(1, response.size());
        assertEquals(300, response.get(0).getTotalPoints());
        assertEquals(3, response.get(0).getPoles());
    }

    @Test
    void getAllPointsEvolutionTeam_ShouldReturnEvolution() {
        Season season = new Season(1L, "Temp", 1, 2024);
        Team team = new Team(1L, "Ferrari", "", "", season);
        Race race = new Race(1L, "GP", "", "", LocalDateTime.now(), season, 0);
        Driver driver = new Driver(1L, "Carlos", 55, "", season, team);
        Result result = new Result(1L, race, driver, new Position(1L, 1, 25), 1, 0);
        Sprint sprint = new Sprint(1L, race, driver, new SprintPosition(1L, 1, 8));

        when(resultRepository.findByTeamIds(anyList())).thenReturn(List.of(result));
        when(sprintRepository.findByTeamIds(anyList())).thenReturn(List.of(sprint));
        when(raceImpl.raceToRaceDTO(race)).thenReturn(new RaceDTO(1L, "GP", "", "", race.getDateStart(), null, 0));
        when(teamImpl.teamToTeamDTO(team)).thenReturn(new TeamDTO(1L, "Ferrari", "", "", null));

        List<TeamPointsEvolutionDTO> evolutions = teamService.getAllPointsEvolutionTeam(Set.of(1));

        assertEquals(1, evolutions.size());
    }
}