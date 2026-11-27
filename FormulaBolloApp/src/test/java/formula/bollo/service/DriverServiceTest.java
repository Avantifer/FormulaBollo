package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import formula.bollo.entity.Driver;
import formula.bollo.entity.Position;
import formula.bollo.entity.Race;
import formula.bollo.entity.Result;
import formula.bollo.entity.Season;
import formula.bollo.entity.Team;
import formula.bollo.impl.DriverImpl;
import formula.bollo.impl.ResultImpl;
import formula.bollo.model.DriverDTO;
import formula.bollo.model.DriverInfoDTO;
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

        DriverInfoDTO driverInfoDTO = this.driverService.getAllInfoDriver(drivers);

        assertNotNull(driverInfoDTO);
    }

    @Test
    void getAllInfoDriversComputesStatsInMemory() {
        Season season = new Season(2L, "Temporada 2", 2, 2024);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);

        Race older = new Race();
        older.setId(1L);
        older.setDateStart(LocalDateTime.of(2024, 1, 1, 0, 0));
        Race newer = new Race();
        newer.setId(2L);
        newer.setDateStart(LocalDateTime.of(2024, 2, 1, 0, 0));

        Result win = new Result(1L, older, driver, new Position(1L, 1, 25), 1, 1);
        Result fourth = new Result(2L, newer, driver, new Position(4L, 4, 12), 0, 0);
        Result dnf = new Result(3L, newer, driver, null, 0, 0);

        when(resultRepository.findWithRaceAndPositionByDriverIds(anyList())).thenReturn(List.of(win, fourth, dnf));
        when(sprintRepository.findByDriverIds(anyList())).thenReturn(List.of());
        when(penaltyRepository.countByDriver(anyList())).thenReturn(List.<Object[]>of(new Object[] { 1L, 2L }));
        when(championshipRepository.countByDriver(anyList())).thenReturn(List.of());
        when(resultService.sumPoints(anyList(), anyList())).thenReturn(38);
        when(resultImpl.convertResultsToResultsDTO(anyList())).thenReturn(List.of());

        DriverInfoDTO info = this.driverService.getAllInfoDrivers(List.of(driver)).get(0);

        assertEquals(1, info.getPoles());
        assertEquals(1, info.getFastlaps());
        assertEquals(2, info.getRacesFinished());
        assertEquals(1, info.getPodiums());
        assertEquals(1, info.getVictories());
        assertEquals(1, info.getBestPosition());
        assertEquals(2.5, info.getAveragePosition());
        assertEquals(2, info.getPenalties());
        assertEquals(0, info.getChampionships());
        assertEquals(38, info.getTotalPoints());

        // Las 5 últimas carreras terminadas, de la más reciente a la más antigua.
        ArgumentCaptor<List<Result>> last5 = ArgumentCaptor.captor();
        verify(resultImpl).convertResultsToResultsDTO(last5.capture());
        assertEquals(List.of(fourth, win), last5.getValue());
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
    void sumDuplicatesKeepsTheBestPositionWeightsTheAverageAndMergesLastResults() {
        SeasonDTO season1 = new SeasonDTO(1L, "Temporada 1", 1, "2023");
        SeasonDTO season2 = new SeasonDTO(2L, "Temporada 2", 2, "2024");
        DriverDTO driver1 = new DriverDTO(1L, "Ana", 1, "", season1, null);
        DriverDTO driver2 = new DriverDTO(2L, "Ana", 1, "", season2, null);
        DriverDTO driver3 = new DriverDTO(3L, "Ana", 1, "", season2, null);
        // 10 carreras (media 4,0, mejor 1), 30 carreras (media 8,0, mejor 8) y una entrada sin carreras (mejor 0).
        DriverInfoDTO first = new DriverInfoDTO(driver1, 0, 0, 10, 0, 0, 0, 1, 0, 0, 4.0, List.of(
                resultOn(1L, 2023, 12), resultOn(2L, 2023, 11), resultOn(3L, 2023, 10), resultOn(4L, 2023, 9),
                resultOn(5L, 2023, 8)));
        DriverInfoDTO second = new DriverInfoDTO(driver2, 0, 0, 30, 0, 0, 0, 8, 0, 0, 8.0, List.of(
                resultOn(6L, 2024, 3), resultOn(7L, 2024, 2), resultOn(8L, 2024, 1)));
        DriverInfoDTO empty = new DriverInfoDTO(driver3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, List.of());

        DriverInfoDTO merged = driverService.sumDuplicates(Arrays.asList(first, second, empty)).get(0);

        assertEquals(1, merged.getBestPosition());
        assertEquals(40, merged.getRacesFinished());
        assertEquals(7.0, merged.getAveragePosition(), 0.0001); // (4,0 * 10 + 8,0 * 30) / 40
        assertEquals(List.of(6L, 7L, 8L, 1L, 2L),
                merged.getLast5Results().stream().map(formula.bollo.model.ResultDTO::getId).toList());
    }

    @ParameterizedTest
    @CsvSource({"2, 200, true", "3, 50, true", "2, 50, false"})
    void sumDuplicatesSelectsDriverBeforeSummingCounters(int incomingSeason, int incomingPoints,
            boolean useIncoming) {
        SeasonDTO season = new SeasonDTO(2L, "Season 2", 2, "2026");
        SeasonDTO nextSeason = new SeasonDTO((long) incomingSeason, "Incoming", incomingSeason, "2027");
        DriverDTO firstDriver = new DriverDTO(1L, "Ana", 1, "", season, null);
        DriverDTO secondDriver = new DriverDTO(2L, "Ana", 1, "", nextSeason, null);
        DriverInfoDTO first = new DriverInfoDTO(firstDriver, 1, 2, 3, 100, 4, 5, 2, 6, 7, 4.0, List.of());
        DriverInfoDTO second = new DriverInfoDTO(secondDriver, 10, 20, 30, incomingPoints,
                40, 50, 1, 60, 70, 8.0, List.of());

        List<DriverInfoDTO> merged = driverService.sumDuplicates(List.of(first, second));

        assertEquals(1, merged.size());
        DriverInfoDTO info = merged.getFirst();
        assertSame(useIncoming ? secondDriver : firstDriver, info.getDriver());
        assertEquals(100 + incomingPoints, info.getTotalPoints());
        assertEquals(11, info.getPoles());
        assertEquals(22, info.getFastlaps());
        assertEquals(33, info.getRacesFinished());
        assertEquals(44, info.getChampionships());
        assertEquals(55, info.getPenalties());
        assertEquals(66, info.getVictories());
        assertEquals(77, info.getPodiums());
    }

    private static formula.bollo.model.ResultDTO resultOn(long id, int year, int month) {
        formula.bollo.model.RaceDTO race = new formula.bollo.model.RaceDTO(id, "GP", "", "",
                LocalDateTime.of(year, month, 1, 12, 0), null, 1);
        return new formula.bollo.model.ResultDTO(id, race, null, null, 0, 0);
    }
}
