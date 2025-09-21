package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import formula.bollo.entity.Driver;
import formula.bollo.entity.Position;
import formula.bollo.entity.Race;
import formula.bollo.entity.Result;
import formula.bollo.entity.Season;
import formula.bollo.entity.Sprint;
import formula.bollo.entity.SprintPosition;
import formula.bollo.entity.Team;
import formula.bollo.impl.DriverImpl;
import formula.bollo.impl.RaceImpl;
import formula.bollo.impl.ResultImpl;
import formula.bollo.impl.SeasonImpl;
import formula.bollo.impl.TeamImpl;
import formula.bollo.model.DriverDTO;
import formula.bollo.model.DriverInfoDTO;
import formula.bollo.model.DriverPointsDTO;
import formula.bollo.model.DriverPointsEvolutionDTO;
import formula.bollo.model.RecordDTO;
import formula.bollo.model.SeasonDTO;
import formula.bollo.model.TeamDTO;
import formula.bollo.repository.ChampionshipRepository;
import formula.bollo.repository.PenaltyRepository;
import formula.bollo.repository.ResultRepository;
import formula.bollo.repository.SprintRepository;
import formula.bollo.utils.Constants;

@ExtendWith(MockitoExtension.class)
class DriverServiceTest {

    @InjectMocks
    private DriverService driverService;

    @Mock
    private DriverImpl driverImpl;

    @Mock
    private ResultImpl resultImpl;

    @Mock
    private TeamImpl teamImpl;

    @Mock
    private SeasonImpl seasonImpl;

    @Mock
    private RaceImpl raceImpl;

    @Mock
    private ResultRepository resultRepository;

    @Mock
    private ChampionshipRepository championshipRepository;

    @Mock
    private PenaltyRepository penaltyRepository;

    @Mock
    private SprintRepository sprintRepository;

    @Mock
    private ResultService resultService;

    @Test
    void getAllInfoDriverEmpty() {
        DriverInfoDTO driverInfoDTO = this.driverService.getAllInfoDriver(Arrays.asList());

        assertNull(driverInfoDTO);
    }

    @Test
    void getAllInfoDriverList() {
        Season season = new Season((long) Constants.ACTUAL_SEASON, "Temporada 3", Constants.ACTUAL_SEASON, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", Constants.ACTUAL_SEASON, "", season, team);
        List<Driver> drivers = Arrays.asList(driver);

        DriverInfoDTO driverInfoDTO = this.driverService.getAllInfoDriver(drivers);

        assertNotNull(driverInfoDTO);
    }

    @Test
    void getAllInfoDriver() {
        Season season = new Season((long) 2, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        List<Driver> drivers = Arrays.asList(driver);

        when(resultRepository.averagePositionByDriverIds(anyList())).thenReturn(null);

        DriverInfoDTO driverInfoDTO = this.driverService.getAllInfoDriver(drivers);

        assertNotNull(driverInfoDTO);
    }

    @Test
    void sumDuplicates() {
        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Avantifer", 2, "", seasonDTO, teamDTO);

        SeasonDTO seasonDTO2 = new SeasonDTO((long) Constants.ACTUAL_SEASON, "Temporada 3", Constants.ACTUAL_SEASON,
                "2025");
        TeamDTO teamDTO2 = new TeamDTO(2L, "Haas", "", "", seasonDTO2);
        DriverDTO driverDTO2 = new DriverDTO(2L, "Avantifer", 2, "", seasonDTO2, teamDTO2);

        DriverInfoDTO driverInfoDTO = new DriverInfoDTO(driverDTO, 10, 20, 50, 200, 0, 0, 0, 0, 0, 0, null);
        DriverInfoDTO driverInfoDTO2 = new DriverInfoDTO(driverDTO2, 5, 10, 20, 100, 0, 0, 0, 0, 0, 0, null);

        List<DriverInfoDTO> driverInfoDTOs = Arrays.asList(driverInfoDTO, driverInfoDTO2);

        List<DriverInfoDTO> response = driverService.sumDuplicates(driverInfoDTOs);

        assertEquals(15, response.get(0).getPoles());
    }

    @Test
    void getAllRecords() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);

        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Avantifer", 2, "", seasonDTO, teamDTO);

        RecordDTO recordDTO = new RecordDTO("Record general", 1, driver, team, season);
        when(resultRepository.recordPoleDriver()).thenReturn(Arrays.asList(recordDTO));
        when(resultRepository.recordPodiumsDriver()).thenReturn(Arrays.asList(recordDTO));
        when(resultRepository.recordFastlapDriver()).thenReturn(Arrays.asList(recordDTO));
        when(resultRepository.recordVictoriesDriver()).thenReturn(Arrays.asList(recordDTO));
        when(resultRepository.recordPorcentageVictoriesDriver()).thenReturn(Arrays.asList(recordDTO));
        when(penaltyRepository.recordPenaltiesDriver()).thenReturn(Arrays.asList(recordDTO));
        when(resultRepository.recordRacesFinishedDriver()).thenReturn(Arrays.asList(recordDTO));
        when(resultService.getTotalResultsPerDriver(anyInt(), isNull()))
                .thenReturn(Arrays.asList(new DriverPointsDTO(driverDTO, 100)));

        List<RecordDTO> recordDTOs = driverService.getAllRecords();

        assertNotNull(recordDTOs);
    }

    @Test
    void getAllPointsEvolutionDriver() {
        Set<Integer> ids = HashSet.newHashSet(4);
        ids.addAll(Arrays.asList(1, 2, 3, 4));

        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Position position = new Position(1L, 1, 25);

        Race race = new Race(1L, "Francias", "", "", LocalDateTime.now(), season, 0);
        Result result = new Result(1L, race, driver, position, 1, 0);
        Result result2 = new Result(2L, race, driver, position, 0, 0);
        Result result3 = new Result(2L, race, driver, null, 0, 0);

        SprintPosition sprintPosition = new SprintPosition(1L, 1, 8);

        Sprint sprint = new Sprint(1L, race, driver, sprintPosition);
        Sprint sprint2 = new Sprint(1L, race, driver, null);

        when(resultRepository.findByDriverIds(anyList())).thenReturn(Arrays.asList(result, result2, result3));
        when(sprintRepository.findByDriverIds(anyList())).thenReturn(Arrays.asList(sprint, sprint2));

        List<DriverPointsEvolutionDTO> driverPointsEvolutionDTOs = driverService.getAllPointsEvolutionDriver(ids);

        assertNotNull(driverPointsEvolutionDTOs);
    }
}
