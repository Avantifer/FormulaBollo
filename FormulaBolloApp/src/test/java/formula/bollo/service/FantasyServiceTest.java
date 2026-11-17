package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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
import formula.bollo.repository.AccountRepository;
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
    private AccountRepository accountRepository;

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

    @Mock
    private Clock clock;

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

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void saveFantasyElectionIgnoresClientOwnerAndElectionId(boolean hasPrevious) {
        Account account = new Account(7L, "ana", "hash", 0, "ana@example.com");
        AccountDTO owner = new AccountDTO(7L, "ana", "hash", 0, "ana@example.com");
        FantasyElectionDTO input = validElection();
        Race storedRace = prepareElection(input);
        input.setId(999L);
        input.setAccount(new AccountDTO(35L, "ana", "ajena", 1, "otro@example.com"));
        RaceDTO race = new RaceDTO();
        race.setId(3L);
        input.setRace(race);
        FantasyElection mapped = new FantasyElection();
        mapped.setId(999L);
        FantasyElection previous = new FantasyElection();
        previous.setId(12L);
        when(accountRepository.findByUsername("ana")).thenReturn(List.of(account));
        when(accountImpl.accountToAccountDTO(account)).thenReturn(owner);
        when(fantasyElectionImpl.fantasyElectionDTOToFantasyElection(input)).thenAnswer(invocation -> {
            assertSame(owner, input.getAccount());
            assertNull(input.getId());
            return mapped;
        });
        when(fantasyElectionRepository.findByUserIdAndRaceId(7, 3))
                .thenReturn(hasPrevious ? Optional.of(previous) : Optional.empty());

        ResponseEntity<String> response = fantasyService.saveFantasyElection(input, "ana");

        assertEquals(200, response.getStatusCode().value());
        assertSame(account, mapped.getAccount());
        assertSame(storedRace, mapped.getRace());
        assertEquals(hasPrevious ? 12L : null, mapped.getId());
        verify(fantasyElectionRepository).findByUserIdAndRaceId(7, 3);
        verify(fantasyElectionRepository).save(mapped);
    }

    @Test
    void saveFantasyElectionRejectsUnknownPrincipal() {
        ResponseEntity<String> response = fantasyService.saveFantasyElection(validElection(), "desconocido");

        assertEquals(403, response.getStatusCode().value());
        verifyNoInteractions(fantasyElectionRepository, fantasyElectionImpl);
    }

    private FantasyElectionDTO validElection() {
        FantasyElectionDTO input = new FantasyElectionDTO();
        RaceDTO race = new RaceDTO();
        race.setId(3L);
        // La fecha y el estado enviados por el cliente no deciden el plazo.
        race.setDateStart(LocalDateTime.of(2099, 1, 1, 0, 0));
        input.setRace(race);
        DriverDTO first = new DriverDTO();
        first.setId(1L);
        DriverDTO second = new DriverDTO();
        second.setId(2L);
        DriverDTO third = new DriverDTO();
        third.setId(3L);
        input.setDriverOne(first);
        input.setDriverTwo(second);
        input.setDriverThree(third);
        TeamDTO firstTeam = new TeamDTO();
        firstTeam.setId(1L);
        TeamDTO secondTeam = new TeamDTO();
        secondTeam.setId(2L);
        input.setTeamOne(firstTeam);
        input.setTeamTwo(secondTeam);
        return input;
    }

    private Race prepareElection(FantasyElectionDTO input) {
        Race race = new Race(3L, "GP", "", "", LocalDateTime.of(2026, 6, 2, 18, 0), null, 0);
        lenient().when(clock.instant()).thenReturn(Instant.parse("2026-06-02T05:59:59Z"));
        lenient().when(raceRepository.findById(3L)).thenReturn(Optional.of(race));
        lenient().when(accountRepository.findByUsername("ana"))
                .thenReturn(List.of(new Account(7L, "ana", "hash", 0, "ana@example.com")));
        lenient().when(fantasyElectionImpl.fantasyElectionDTOToFantasyElection(input))
                .thenReturn(new FantasyElection());
        List<FantasyPriceDriver> drivers = Stream.of(1L, 2L, 3L).map(id -> {
            Driver driver = new Driver();
            driver.setId(id);
            return new FantasyPriceDriver(id, driver, race, 10_000_000);
        }).toList();
        List<FantasyPriceTeam> teams = Stream.of(1L, 2L).map(id -> {
            Team team = new Team();
            team.setId(id);
            return new FantasyPriceTeam(id, team, race, 25_000_000);
        }).toList();
        lenient().when(fantasyPriceDriverRepository.findByRaceId(3)).thenReturn(drivers);
        lenient().when(fantasyPriceTeamRepository.findByRaceId(3)).thenReturn(teams);
        return race;
    }

    private void assertElectionRejected(FantasyElectionDTO input, int status, String message) {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> fantasyService.saveFantasyElection(input, "ana"));
        assertEquals(status, error.getStatusCode().value());
        assertEquals(message, error.getReason());
        verify(fantasyElectionRepository, never()).save(any());
        verifyNoInteractions(fantasyElectionImpl);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 2})
    void saveFantasyElectionRejectsMissingRace(int missing) {
        FantasyElectionDTO input = validElection();
        prepareElection(input);
        if (missing == 0) input = null;
        else if (missing == 1) input.setRace(null);
        else input.getRace().setId(null);

        assertElectionRejected(input, 400, "Debes indicar la carrera de tu equipo");
    }

    @Test
    void saveFantasyElectionRejectsUnknownRace() {
        FantasyElectionDTO input = validElection();
        prepareElection(input);
        when(raceRepository.findById(3L)).thenReturn(Optional.empty());

        assertElectionRejected(input, 404, "No se ha encontrado la carrera");
    }

    @Test
    void saveFantasyElectionRejectsFinishedRace() {
        FantasyElectionDTO input = validElection();
        prepareElection(input).setFinished(1);

        assertElectionRejected(input, 403, "El plazo para guardar tu equipo ha terminado");
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1})
    void saveFantasyElectionRejectsAtAndAfterDeadline(int secondsAfter) {
        FantasyElectionDTO input = validElection();
        Race race = prepareElection(input);
        when(clock.instant()).thenReturn(race.getDateStart().toInstant(ZoneOffset.UTC)
                .minusSeconds(12 * 3600).plusSeconds(secondsAfter));

        assertElectionRejected(input, 403, "El plazo para guardar tu equipo ha terminado");
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 2, 3, 4, 5})
    void saveFantasyElectionRejectsIncompleteOrRepeatedMembers(int invalid) {
        FantasyElectionDTO input = validElection();
        prepareElection(input);
        switch (invalid) {
            case 0 -> input.setDriverThree(null);
            case 1 -> input.getDriverTwo().setId(null);
            case 2 -> input.getDriverThree().setId(input.getDriverOne().getId());
            case 3 -> input.setTeamTwo(null);
            case 4 -> input.getTeamOne().setId(null);
            case 5 -> input.getTeamTwo().setId(input.getTeamOne().getId());
        }

        assertElectionRejected(input, 400, "Debes elegir 3 pilotos y 2 escuderías distintos y completos");
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void saveFantasyElectionRejectsMissingPriceForRace(boolean team) {
        FantasyElectionDTO input = validElection();
        prepareElection(input);
        if (team) input.getTeamTwo().setId(99L);
        else input.getDriverThree().setId(99L);

        assertElectionRejected(input, 400, "Todos los pilotos y escuderías deben tener precio para esta carrera");
    }

    @ParameterizedTest
    @ValueSource(ints = {25_000_001, Integer.MAX_VALUE})
    void saveFantasyElectionRejectsOverBudgetWithoutIntegerOverflow(int teamPrice) {
        FantasyElectionDTO input = validElection();
        Race race = prepareElection(input);
        Team team = new Team();
        team.setId(2L);
        FantasyPriceTeam first = fantasyPriceTeamRepository.findByRaceId(3).getFirst();
        when(fantasyPriceTeamRepository.findByRaceId(3))
                .thenReturn(List.of(first, new FantasyPriceTeam(2L, team, race, teamPrice)));

        assertElectionRejected(input, 400, "Te pasas del presupuesto");
    }

    @Test
    void saveFantasyElectionIsTransactional() throws Exception {
        assertNotNull(FantasyService.class.getMethod("saveFantasyElection", FantasyElectionDTO.class, String.class)
                .getAnnotation(Transactional.class));
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

        FantasyPriceDriver fantasyPriceDriver = new FantasyPriceDriver(1L, driver, race, 9_000_000);

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

        FantasyPriceDriver fantasyPriceDriver = new FantasyPriceDriver(1L, driver, race, 14_000_000);

        when(fantasyPriceDriverRepository.findByRaceId(anyInt())).thenReturn(Arrays.asList(fantasyPriceDriver));

        int points = fantasyService.calculatePoints(result, 15);

        assertEquals(17, points);
    }

    @ParameterizedTest
    @CsvSource({"1000000,22", "9999999,22", "10000000,16", "20000000,16", "20000001,12", "30000000,12"})
    void calculatePointsUsesRealPriceBonusBoundaries(int price, int expectedPoints) {
        Driver driver = new Driver();
        driver.setId(1L);
        Race race = new Race(3L, "GP", "", "", LocalDateTime.of(2026, 6, 2, 18, 0), null, 0);
        Result result = new Result(1L, race, driver, new Position(1L, 1, 25), 0, 0);
        when(fantasyPriceDriverRepository.findByRaceId(3))
                .thenReturn(List.of(new FantasyPriceDriver(1L, driver, race, price)));

        assertEquals(expectedPoints, fantasyService.calculatePoints(result, 8));
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
        verify(raceRepository).findAllFinished(0);
        verifyNoMoreInteractions(raceRepository);
    }

    @Test
    void getFantasyElectionEmpty() {
        Account account = new Account();
        account.setId(7L);
        when(accountRepository.findByUsername("ana")).thenReturn(List.of(account));

        FantasyElectionDTO fantasyElectionDTO = fantasyService.getFantasyElection(12, "ana");

        assertNull(fantasyElectionDTO);
        verify(fantasyElectionRepository).findByUserIdAndRaceId(7, 12);
        verifyNoInteractions(fantasyElectionImpl);
    }

    @Test
    void getFantasyElectionUsesAccountResolvedByUsername() {
        Account account = new Account();
        account.setId(7L);
        FantasyElection election = new FantasyElection();
        election.setAccount(account);
        FantasyElectionDTO expected = new FantasyElectionDTO();
        expected.setId(21L);
        when(accountRepository.findByUsername("ana")).thenReturn(List.of(account));
        when(fantasyElectionRepository.findByUserIdAndRaceId(7, 12)).thenReturn(Optional.of(election));
        when(fantasyElectionImpl.fantasyElectionToFantasyElectionDTO(election)).thenReturn(expected);

        assertSame(expected, fantasyService.getFantasyElection(12, "ana"));
        verify(accountRepository).findByUsername("ana");
        verify(fantasyElectionRepository).findByUserIdAndRaceId(7, 12);
        verifyNoMoreInteractions(accountRepository, fantasyElectionRepository);
    }

    @Test
    void getFantasyElectionRejectsUnknownPrincipal() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> fantasyService.getFantasyElection(12, "desconocido"));

        assertEquals(403, error.getStatusCode().value());
        verifyNoInteractions(fantasyElectionRepository, fantasyElectionImpl);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 2, -1})
    void getFantasyPointsRaceHidesElectionsUntilFinished(int finished) {
        Race race = new Race();
        race.setFinished(finished);
        when(raceRepository.findById(12L)).thenReturn(Optional.of(race));

        assertEquals(List.of(), fantasyService.getFantasyPointsRace(12));
        verify(raceRepository).findById(12L);
        verifyNoInteractions(fantasyElectionRepository, fantasyPointsDriverRepository, fantasyPointsTeamRepository);
    }

    @Test
    void getFantasyPointsRaceHidesElectionsForMissingRace() {
        when(raceRepository.findById(12L)).thenReturn(Optional.empty());

        assertEquals(List.of(), fantasyService.getFantasyPointsRace(12));
        verifyNoInteractions(fantasyElectionRepository, fantasyPointsDriverRepository, fantasyPointsTeamRepository);
    }

    @Test
    void getFantasyPointsRacePreservesFinishedRaceRanking() {
        Race race = new Race();
        race.setFinished(1);
        Team team = new Team();
        team.setId(1L);
        Driver driver = new Driver();
        driver.setId(1L);
        Driver otherDriver = new Driver();
        otherDriver.setId(2L);
        Account ana = new Account();
        ana.setId(7L);
        Account bob = new Account();
        bob.setId(8L);
        FantasyElection anaElection = new FantasyElection(1L, ana, driver, driver, driver, team, team, race);
        FantasyElection bobElection = new FantasyElection(2L, bob, otherDriver, otherDriver, otherDriver, team, team, race);
        FantasyElectionDTO anaElectionDTO = new FantasyElectionDTO();
        FantasyElectionDTO bobElectionDTO = new FantasyElectionDTO();
        AccountDTO anaDTO = new AccountDTO();
        AccountDTO bobDTO = new AccountDTO();
        when(raceRepository.findById(12L)).thenReturn(Optional.of(race));
        when(fantasyElectionRepository.findByRaceId(12)).thenReturn(List.of(bobElection, anaElection));
        when(fantasyPointsDriverRepository.findByRaceId(12)).thenReturn(List.of(
                new FantasyPointsDriver(1L, driver, race, 20),
                new FantasyPointsDriver(2L, otherDriver, race, 5)));
        when(fantasyPointsTeamRepository.findByRaceId(12)).thenReturn(List.of(new FantasyPointsTeam(1L, team, race, 3)));
        when(accountImpl.accountToAccountDTO(ana)).thenReturn(anaDTO);
        when(accountImpl.accountToAccountDTO(bob)).thenReturn(bobDTO);
        when(fantasyElectionImpl.fantasyElectionToFantasyElectionDTO(anaElection)).thenReturn(anaElectionDTO);
        when(fantasyElectionImpl.fantasyElectionToFantasyElectionDTO(bobElection)).thenReturn(bobElectionDTO);

        List<FantasyPointsAccountDTO> points = fantasyService.getFantasyPointsRace(12);

        assertEquals(List.of(23, 8), points.stream().map(FantasyPointsAccountDTO::getTotalPoints).toList());
        assertSame(anaDTO, points.get(0).getAccount());
        assertSame(anaElectionDTO, points.get(0).getFantasyElection());
        assertSame(bobDTO, points.get(1).getAccount());
        assertSame(bobElectionDTO, points.get(1).getFantasyElection());
        verify(fantasyElectionRepository).findByRaceId(12);
        verify(raceRepository).findById(12L);
        verifyNoMoreInteractions(raceRepository);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void invalidSecondResultDoesNotDeleteAnyFantasyData(boolean prices) {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Driver incomplete = new Driver(2L, "Otro", 3, "", season, null);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);
        when(resultRepository.findByRaceId(1)).thenReturn(List.of(
                new Result(1L, race, driver, null, 0, 0),
                new Result(2L, race, incomplete, null, 0, 0)));

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> {
            if (prices) fantasyService.saveDriverTeamPrices(1);
            else fantasyService.saveDriverTeamPoints(1);
        });

        assertEquals(400, error.getStatusCode().value());
        verifyNoInteractions(fantasyPriceDriverRepository, fantasyPriceTeamRepository,
                fantasyPointsDriverRepository, fantasyPointsTeamRepository);
    }

    @Test
    void replacementMethodsHaveServiceTransactionBoundaries() throws Exception {
        assertNotNull(FantasyService.class.getMethod("saveDriverTeamPoints", int.class)
                .getAnnotation(Transactional.class));
        assertNotNull(FantasyService.class.getMethod("saveDriverTeamPrices", int.class)
                .getAnnotation(Transactional.class));
    }

    @Test
    void batchCalculationsLoadPricesAndPointsOnceAndPreserveFormulas() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Uno", 2, "", season, team);
        Driver other = new Driver(2L, "Dos", 3, "", season, team);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);
        Race nextRace = new Race(2L, "Italia", "", "", LocalDateTime.now(), season, 0);
        List<Result> results = List.of(
                new Result(1L, race, driver, new Position(1L, 1, 25), 1, 1),
                new Result(2L, race, other, new Position(2L, 5, 10), 0, 0));
        when(fantasyPriceDriverRepository.findByRaceId(1)).thenReturn(List.of(
                new FantasyPriceDriver(1L, driver, race, 9_000_000),
                new FantasyPriceDriver(2L, other, race, 14_000_000)));

        List<FantasyPointsDriver> points = fantasyService.createDriversPoints(results);

        assertEquals(List.of(27, 11), points.stream().map(FantasyPointsDriver::getPoints).toList());
        verify(fantasyPriceDriverRepository, times(1)).findByRaceId(1);
        when(fantasyPointsDriverRepository.findByRaceId(1)).thenReturn(points);
        List<FantasyPriceDriver> prices = fantasyService.createDriversPrices(results, nextRace);
        assertEquals(List.of(14_400_000, 16_200_000), prices.stream().map(FantasyPriceDriver::getPrice).toList());
        verify(fantasyPriceDriverRepository, times(2)).findByRaceId(1);
        verify(fantasyPointsDriverRepository, times(1)).findByRaceId(1);
        assertSame(nextRace, prices.getFirst().getRace());
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 2})
    void averagesUseRequestedSeasonAndHandleNoFinishedRaces(int finished) {
        Season season = new Season(2L, "Anterior", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Uno", 2, "", season, team);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);
        SeasonDTO seasonDTO = new SeasonDTO(2L, "Anterior", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Uno", 2, "", seasonDTO, teamDTO);
        RaceDTO raceDTO = new RaceDTO(1L, "Francia", "", "", LocalDateTime.now(), seasonDTO, 0);
        when(raceRepository.findById(1L)).thenReturn(Optional.of(race));
        when(raceRepository.findAllFinished(2)).thenReturn(finished == 0 ? List.of() : List.of(race, race));
        when(fantasyPriceImpl.convertFantasyPriceDriverToFantasyPriceDriverDTO(anyList())).thenReturn(
                new java.util.ArrayList<>(List.of(new FantasyPriceDriverDTO(1L, driverDTO, raceDTO, 1000000, null))));
        when(fantasyPriceImpl.convertFantasyPriceTeamToFantasyPriceTeamDTO(anyList())).thenReturn(
                new java.util.ArrayList<>(List.of(new FantasyPriceTeamDTO(1L, teamDTO, raceDTO, 1000000, null))));
        when(fantasyPointsDriverRepository.findByDriverIds(List.of(1L)))
                .thenReturn(List.of(new FantasyPointsDriver(1L, driver, race, 10)));
        when(fantasyPointsTeamRepository.findByTeamIds(List.of(1L)))
                .thenReturn(List.of(new FantasyPointsTeam(1L, team, race, 10)));

        assertEquals(finished == 0 ? 0 : 5,
                fantasyService.getAllDriverPrices(1).getFirst().getFantasyInfo().getAveragePoints());
        assertEquals(finished == 0 ? 0 : 5,
                fantasyService.getAllTeamPrices(1).getFirst().getFantasyInfo().getAveragePoints());
        verify(raceRepository, times(2)).findAllFinished(2);
    }
}
