package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import formula.bollo.entity.Account;
import formula.bollo.entity.Driver;
import formula.bollo.entity.FantasyElection;
import formula.bollo.entity.FantasyPointsDriver;
import formula.bollo.entity.FantasyPointsTeam;
import formula.bollo.entity.FantasyPriceDriver;
import formula.bollo.entity.FantasyPriceTeam;
import formula.bollo.entity.Position;
import formula.bollo.entity.Race;
import formula.bollo.entity.Result;
import formula.bollo.entity.Season;
import formula.bollo.entity.Team;
import formula.bollo.impl.AccountImpl;
import formula.bollo.impl.FantasyElectionImpl;
import formula.bollo.impl.FantasyPriceImpl;
import formula.bollo.impl.RaceImpl;
import formula.bollo.model.AccountDTO;
import formula.bollo.model.DriverDTO;
import formula.bollo.model.FantasyElectionDTO;
import formula.bollo.model.FantasyInfoDTO;
import formula.bollo.model.FantasyPointsAccountDTO;
import formula.bollo.model.FantasyPriceDriverDTO;
import formula.bollo.model.FantasyPriceTeamDTO;
import formula.bollo.model.RaceDTO;
import formula.bollo.model.SeasonDTO;
import formula.bollo.model.TeamDTO;
import formula.bollo.repository.FantasyElectionRepository;
import formula.bollo.repository.FantasyPointsDriverRepository;
import formula.bollo.repository.FantasyPointsTeamRepository;
import formula.bollo.repository.FantasyPriceDriverRepository;
import formula.bollo.repository.FantasyPriceTeamRepository;
import formula.bollo.repository.RaceRepository;
import formula.bollo.repository.ResultRepository;

@ExtendWith(MockitoExtension.class)
class FantasyServiceTest {

    @InjectMocks
    private FantasyService fantasyService;

    @Mock
    private ResultRepository resultRepository;

    @Mock
    private FantasyPointsDriverRepository fantasyPointsDriverRepository;

    @Mock
    private FantasyPriceDriverRepository fantasyPriceDriverRepository;

    @Mock
    private FantasyPointsTeamRepository fantasyPointsTeamRepository;

    @Mock
    private RaceRepository raceRepository;

    @Mock
    private FantasyPriceTeamRepository fantasyPriceTeamRepository;

    @Mock
    private FantasyElectionRepository fantasyElectionRepository;

    @Mock
    private FantasyElectionImpl fantasyElectionImpl;

    @Mock
    private FantasyPriceImpl fantasyPriceImpl;

    @Mock
    private AccountImpl accountImpl;

    @Mock
    private RaceImpl raceImpl;

    @Test
    void saveDriverTeamPointsEmpty() {
        ResponseEntity<String> response = fantasyService.saveDriverTeamPoints(0);

        assertEquals("Hubo un problema con los puntos. Contacte con el administrador", response.getBody());
    }

    @Test
    void saveDriverTeamPoints() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Position position = new Position(1L, 1, 25);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        Result result = new Result(1L, race, driver, position, 1, 1);
        Result result2 = new Result(2L, race, driver, null, 0, 0);
        FantasyPriceDriver fantasyPriceDriver = new FantasyPriceDriver(1L, driver, race, 200);

        when(resultRepository.findByRaceId(anyInt())).thenReturn(Arrays.asList(result, result2));
        when(fantasyPriceDriverRepository.findByRaceId(anyInt())).thenReturn(Arrays.asList(fantasyPriceDriver));

        ResponseEntity<String> response = fantasyService.saveDriverTeamPoints(0);

        assertEquals("Puntos guardados correctamente", response.getBody());
        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    void saveDriverTeamPricesNextRaceEmpty() {
        ResponseEntity<String> response = fantasyService.saveDriverTeamPrices(0);

        assertEquals("No se ha encontrado la siguiente carrera", response.getBody());
    }

    @Test
    void saveDriverTeamPricesEmpty() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        when(raceRepository.findById(anyLong())).thenReturn(Optional.of(race));

        ResponseEntity<String> response = fantasyService.saveDriverTeamPrices(0);

        assertEquals("Hubo un problema con los precios. Contacte con el administrador", response.getBody());
    }

    @Test
    void saveDriverTeamPrices() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Position position = new Position(1L, 1, 25);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        Result result = new Result(1L, race, driver, position, 1, 1);
        Result result2 = new Result(2L, race, driver, null, 0, 0);
        FantasyPriceDriver fantasyPriceDriver = new FantasyPriceDriver(1L, driver, race, 200);
        FantasyPointsDriver fantasyPointsDriver = new FantasyPointsDriver(1L, driver, race, 5);

        when(resultRepository.findByRaceId(anyInt())).thenReturn(Arrays.asList(result, result2));
        when(raceRepository.findById(anyLong())).thenReturn(Optional.of(race));
        when(fantasyPriceDriverRepository.findByRaceId(anyInt())).thenReturn(Arrays.asList(fantasyPriceDriver));
        when(fantasyPointsDriverRepository.findByRaceId(anyInt())).thenReturn(Arrays.asList(fantasyPointsDriver));
        ResponseEntity<String> response = fantasyService.saveDriverTeamPrices(0);

        assertEquals("Precios guardados correctamente", response.getBody());
        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    void saveFantasyElectionWithPrevious() {
        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Avantifer", 2, "", seasonDTO, teamDTO);
        RaceDTO raceDTO = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), seasonDTO, 0);
        AccountDTO accountDTO = new AccountDTO(1L, "Avantifer", "123", 1, "email@email.com");

        FantasyElectionDTO fantasyElectionDTO = new FantasyElectionDTO(1L, accountDTO, driverDTO, driverDTO, driverDTO,
                teamDTO, teamDTO, raceDTO);

        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);
        Account account = new Account(1L, "Avantifer", "123", 1, "email@email.com");

        FantasyElection fantasyElection = new FantasyElection(1L, account, driver, driver, driver,
                team, team, race);

        when(fantasyElectionImpl.fantasyElectionDTOToFantasyElection(any())).thenReturn(fantasyElection);
        when(fantasyElectionRepository.findByUserIdAndRaceId(anyInt(), anyInt()))
                .thenReturn(Optional.of(fantasyElection));

        ResponseEntity<String> response = fantasyService.saveFantasyElection(fantasyElectionDTO);

        assertEquals("Tu equipo ha sido guardado correctamente", response.getBody());
        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    void saveFantasyElection() {
        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Avantifer", 2, "", seasonDTO, teamDTO);
        RaceDTO raceDTO = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), seasonDTO, 0);
        AccountDTO accountDTO = new AccountDTO(1L, "Avantifer", "123", 1, "email@email.com");

        FantasyElectionDTO fantasyElectionDTO = new FantasyElectionDTO(1L, accountDTO, driverDTO, driverDTO, driverDTO,
                teamDTO, teamDTO, raceDTO);

        ResponseEntity<String> response = fantasyService.saveFantasyElection(fantasyElectionDTO);

        assertEquals("Tu equipo ha sido guardado correctamente", response.getBody());
        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    void createDriversPoints() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Position position = new Position(1L, 1, 25);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        Result result = new Result(1L, race, driver, position, 1, 1);
        List<FantasyPointsDriver> fantasyPointsDrivers = fantasyService.createDriversPoints(Arrays.asList(result));

        assertEquals(0, fantasyPointsDrivers.size());
    }

    @Test
    void calculatePointsGoodPosition() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Position position = new Position(1L, 1, 25);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        Result result = new Result(1L, race, driver, position, 1, 1);

        FantasyPriceDriver fantasyPriceDriver = new FantasyPriceDriver(1L, driver, race, 9);

        when(fantasyPriceDriverRepository.findByRaceId(anyInt())).thenReturn(Arrays.asList(fantasyPriceDriver));

        int points = fantasyService.calculatePoints(result, 15);

        assertEquals(42, points);
    }

    @Test
    void calculatePointsMediumPosition() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Position position = new Position(1L, 5, 5);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        Result result = new Result(2L, race, driver, position, 0, 0);

        FantasyPriceDriver fantasyPriceDriver = new FantasyPriceDriver(1L, driver, race, 14);

        when(fantasyPriceDriverRepository.findByRaceId(anyInt())).thenReturn(Arrays.asList(fantasyPriceDriver));

        int points = fantasyService.calculatePoints(result, 15);

        assertEquals(17, points);
    }

    @Test
    void createDriversPrices() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Position position = new Position(1L, 1, 25);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        Result result = new Result(1L, race, driver, position, 1, 1);
        List<FantasyPriceDriver> fantasyPointsDrivers = fantasyService.createDriversPrices(Arrays.asList(result), race);

        assertEquals(0, fantasyPointsDrivers.size());
    }

    @Test
    void calculateDriverPriceFantasyPointNull() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Position position = new Position(1L, 1, 25);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        Result result = new Result(1L, race, driver, position, 1, 1);
        FantasyPriceDriver fantasyPriceDriver = new FantasyPriceDriver(1L, driver, race, 14);

        when(fantasyPriceDriverRepository.findByRaceId(anyInt())).thenReturn(Arrays.asList(fantasyPriceDriver));

        int price = fantasyService.calculateDriverPrice(result);

        assertEquals(-1, price);
    }

    @ParameterizedTest
    @MethodSource("provideFantasyPriceData")
    void calculateDriverPriceFantasy(int fantasyPoints, int previousPrice, int expectedPrice) {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Position position = new Position(1L, 1, 25);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        Result result = new Result(1L, race, driver, position, 1, 1);
        FantasyPriceDriver fantasyPriceDriver = new FantasyPriceDriver(1L, driver, race, previousPrice);
        FantasyPointsDriver fantasyPointsDriver = new FantasyPointsDriver(1L, driver, race, fantasyPoints);

        when(fantasyPointsDriverRepository.findByRaceId(anyInt()))
                .thenReturn(Arrays.asList(fantasyPointsDriver));
        when(fantasyPriceDriverRepository.findByRaceId(anyInt()))
                .thenReturn(Arrays.asList(fantasyPriceDriver));

        int actualPrice = fantasyService.calculateDriverPrice(result);

        assertEquals(expectedPrice, actualPrice);
    }

    private static Stream<Arguments> provideFantasyPriceData() {
        return Stream.of(
                Arguments.of(10, 30000000, 30000000),
                Arguments.of(5, 20000000, 19000000),
                Arguments.of(7, 15000000, 16400000),
                Arguments.of(4, 15000000, 13500000),
                Arguments.of(4, 8000000, 8800000),
                Arguments.of(2, 8000000, 6960000),
                Arguments.of(1, 5000000, 4350000),
                Arguments.of(0, 1000000, 1000000),
                Arguments.of(10, 1000000, 3000000));
    }

    @Test
    void getAllDriverPrices() {
        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Avantifer", 2, "", seasonDTO, teamDTO);
        RaceDTO raceDTO = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), seasonDTO, 0);

        FantasyInfoDTO fantasyInfoDTO = new FantasyInfoDTO(100, 50, 2.5);
        FantasyPriceDriverDTO fantasyPriceDriverDTO = new FantasyPriceDriverDTO(1L, driverDTO, raceDTO, 2000,
                fantasyInfoDTO);

        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        FantasyPriceDriver fantasyPriceDriver = new FantasyPriceDriver(1L, driver, race, 300);

        when(fantasyPriceImpl.convertFantasyPriceDriverToFantasyPriceDriverDTO(anyList()))
                .thenReturn(Arrays.asList(fantasyPriceDriverDTO, fantasyPriceDriverDTO));
        when(fantasyPriceDriverRepository.findTwoLastPricesForAllDrivers(anyList()))
                .thenReturn(Arrays.asList(fantasyPriceDriver, fantasyPriceDriver));

        List<FantasyPriceDriverDTO> fantasyPriceDriverDTOs = fantasyService.getAllDriverPrices(0);

        assertEquals(2, fantasyPriceDriverDTOs.size());
    }

    @Test
    void getAllTeamPrices() {
        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        RaceDTO raceDTO = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), seasonDTO, 0);

        FantasyInfoDTO fantasyInfoDTO = new FantasyInfoDTO(100, 50, 2.5);
        FantasyPriceTeamDTO fantasyPriceDriverDTO = new FantasyPriceTeamDTO(1L, teamDTO, raceDTO, 2000,
                fantasyInfoDTO);

        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        FantasyPriceTeam fantasyPriceTeam = new FantasyPriceTeam(1L, team, race, 300);

        when(fantasyPriceImpl.convertFantasyPriceTeamToFantasyPriceTeamDTO(anyList()))
                .thenReturn(Arrays.asList(fantasyPriceDriverDTO, fantasyPriceDriverDTO));
        when(fantasyPriceTeamRepository.findTwoLastPricesForAllTeams(anyList()))
                .thenReturn(Arrays.asList(fantasyPriceTeam, fantasyPriceTeam));

        List<FantasyPriceTeamDTO> fantasyPriceDriverDTOs = fantasyService.getAllTeamPrices(0);

        assertEquals(2, fantasyPriceDriverDTOs.size());
    }

    @Test
    void getFantasyPoints() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);
        Account account = new Account(1L, "Avantifer", "123", 1, "email@email.com");

        FantasyElection fantasyElection = new FantasyElection(1L, account, driver, driver, driver,
                team, team, race);
        FantasyPointsDriver fantasyPointsDriver = new FantasyPointsDriver(1L, driver, race, 0);
        FantasyPointsTeam fantasyPointsTeam = new FantasyPointsTeam(1L, team, race, 0);

        when(fantasyPointsTeamRepository.findByRaceId(anyInt())).thenReturn(Arrays.asList(fantasyPointsTeam));
        when(fantasyPointsDriverRepository.findByRaceId(anyInt())).thenReturn(Arrays.asList(fantasyPointsDriver));
        when(fantasyElectionRepository.findByRaceId(anyInt())).thenReturn(Arrays.asList(fantasyElection));

        List<FantasyPointsAccountDTO> fantasyPointsAccountDTOs = fantasyService.getFantasyPoints(0);

        assertEquals(1, fantasyPointsAccountDTOs.size());
    }

    @Test
    void sumAllFantasyPoints() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);
        Account account = new Account(1L, "Avantifer", "123", 1, "email@email.com");

        FantasyElection fantasyElection = new FantasyElection(1L, account, driver, driver, driver,
                team, team, race);
        FantasyPointsDriver fantasyPointsDriver = new FantasyPointsDriver(1L, driver, race, 0);
        FantasyPointsTeam fantasyPointsTeam = new FantasyPointsTeam(1L, team, race, 0);

        SeasonDTO seasonDTO = new SeasonDTO(2L, "Temporada 3", 2, "2025");
        RaceDTO raceDTO = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), seasonDTO, 0);

        when(accountImpl.accountToAccountDTO(any()))
                .thenReturn(new AccountDTO(1l, "Avantifer", "123", 1, "email@mail.com"));
        when(raceImpl.convertRacesToRacesDTO(anyList())).thenReturn(Arrays.asList(raceDTO));
        when(fantasyPointsTeamRepository.findByRaceId(anyInt()))
                .thenReturn(Arrays.asList(fantasyPointsTeam, fantasyPointsTeam));
        when(fantasyPointsDriverRepository.findByRaceId(anyInt()))
                .thenReturn(Arrays.asList(fantasyPointsDriver, fantasyPointsDriver));
        when(fantasyElectionRepository.findByRaceId(anyInt()))
                .thenReturn(Arrays.asList(fantasyElection, fantasyElection));

        List<FantasyPointsAccountDTO> fantasyPointsAccountDTOs = fantasyService.sumAllFantasyPoints(0);

        assertEquals(1, fantasyPointsAccountDTOs.size());
    }

    @Test
    void getFantasyElectionEmpty() {
        FantasyElectionDTO fantasyElectionDTO = fantasyService.getFantasyElection(0, 0);
        assertNull(fantasyElectionDTO);
    }

    @Test
    void getFantasyElection() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);
        Account account = new Account(1L, "Avantifer", "123", 1, "email@email.com");

        FantasyElection fantasyElection = new FantasyElection(1L, account, driver, driver, driver,
                team, team, race);

        when(fantasyElectionRepository.findByUserIdAndRaceId(anyInt(), anyInt()))
                .thenReturn(Optional.of(fantasyElection));

        FantasyElectionDTO fantasyElectionDTO = fantasyService.getFantasyElection(0, 0);
        assertNull(fantasyElectionDTO);
    }
}
