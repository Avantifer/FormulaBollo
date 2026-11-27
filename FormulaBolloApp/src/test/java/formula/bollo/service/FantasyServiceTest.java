package formula.bollo.service;

import formula.bollo.impl.TeamImpl;
import formula.bollo.impl.DriverImpl;
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
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.dao.DataIntegrityViolationException;
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
import formula.bollo.model.AccountDTO;
import formula.bollo.model.DriverDTO;
import formula.bollo.model.FantasyElectionDTO;
import formula.bollo.model.FantasyInfoDTO;
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
    private Clock clock;

    @Mock
    private DriverImpl driverImpl;

    @Mock
    private TeamImpl teamImpl;

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
        Driver retired = new Driver(2L, "Retirado", 3, "", season, team);
        Result result2 = new Result(2L, race, retired, null, 0, 0);
        FantasyPriceDriver fantasyPriceDriver = new FantasyPriceDriver(1L, driver, race, 200);

        when(resultRepository.findByRaceId(anyInt())).thenReturn(Arrays.asList(result, result2));
        when(fantasyPriceDriverRepository.findByRaceId(anyInt())).thenReturn(Arrays.asList(fantasyPriceDriver));

        ResponseEntity<String> response = fantasyService.saveDriverTeamPoints(0);

        assertEquals("Puntos guardados correctamente", response.getBody());
        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    void saveDriverTeamPricesUnknownRaceIsNotFound() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> fantasyService.saveDriverTeamPrices(0));

        assertEquals(404, error.getStatusCode().value());
        verifyNoInteractions(fantasyPriceDriverRepository, fantasyPriceTeamRepository);
    }

    @Test
    void saveDriverTeamPricesAfterTheLastRaceOfTheSeasonIsNotAnError() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Race earlier = new Race(1L, "Francia", "", "", LocalDateTime.of(2025, 3, 1, 12, 0), season, 1);
        Race last = new Race(2L, "Italia", "", "", LocalDateTime.of(2025, 3, 8, 12, 0), season, 1);
        when(raceRepository.findById(2L)).thenReturn(Optional.of(last));
        when(raceRepository.findBySeason(2)).thenReturn(List.of(last, earlier));

        ResponseEntity<String> response = fantasyService.saveDriverTeamPrices(2);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("Era la última carrera de la temporada: no hay precios que calcular", response.getBody());
        verifyNoInteractions(fantasyPriceDriverRepository, fantasyPriceTeamRepository);
    }

    @Test
    void saveDriverTeamPricesUsesTheNextRaceOfTheCalendarNotRaceIdPlusOne() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Race earlier = new Race(5L, "Francia", "", "", LocalDateTime.of(2025, 2, 22, 12, 0), season, 1);
        Race race = new Race(10L, "Italia", "", "", LocalDateTime.of(2025, 3, 1, 12, 0), season, 1);
        // Los ids no son contiguos: tras la 10 viene la 40 por fecha, y la 11 no existe en esta temporada.
        Race next = new Race(40L, "Bakú", "", "", LocalDateTime.of(2025, 3, 8, 12, 0), season, 0);
        Race afterNext = new Race(41L, "Monza", "", "", LocalDateTime.of(2025, 3, 15, 12, 0), season, 0);
        Result result = new Result(1L, race, driver, new Position(1L, 1, 25), 1, 1);
        FantasyPriceDriver price = new FantasyPriceDriver(1L, driver, race, 2_000_000);
        FantasyPointsDriver points = new FantasyPointsDriver(1L, driver, race, 5);

        when(resultRepository.findByRaceId(10)).thenReturn(List.of(result));
        when(raceRepository.findById(10L)).thenReturn(Optional.of(race));
        when(raceRepository.findBySeason(2)).thenReturn(List.of(afterNext, earlier, next, race));
        when(fantasyPriceDriverRepository.findByRaceId(anyInt())).thenReturn(List.of(price));
        when(fantasyPointsDriverRepository.findByRaceId(anyInt())).thenReturn(List.of(points));

        ResponseEntity<String> response = fantasyService.saveDriverTeamPrices(10);

        assertEquals("Precios guardados correctamente", response.getBody());
        verify(fantasyPriceDriverRepository).findByRaceId(40); // los precios que se reemplazan son los de la carrera 40
        verify(fantasyPriceTeamRepository).findByRaceId(40);
        org.mockito.ArgumentCaptor<List<FantasyPriceDriver>> saved = org.mockito.ArgumentCaptor.forClass(List.class);
        verify(fantasyPriceDriverRepository).saveAllAndFlush(saved.capture());
        assertEquals(40L, saved.getValue().getFirst().getRace().getId());
    }

    @Test
    void saveDriverTeamPricesEmpty() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        Race next = new Race(2L, "Italia", "", "", LocalDateTime.now().plusDays(7), season, 0);

        when(raceRepository.findById(anyLong())).thenReturn(Optional.of(race));
        when(raceRepository.findBySeason(2)).thenReturn(List.of(race, next));

        ResponseEntity<String> response = fantasyService.saveDriverTeamPrices(0);

        assertEquals(422, response.getStatusCode().value());
        org.assertj.core.api.Assertions.assertThat(response.getBody()).contains("resultados", "puntos", "Francia");
    }

    @Test
    void saveDriverTeamPrices() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Position position = new Position(1L, 1, 25);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        Result result = new Result(1L, race, driver, position, 1, 1);
        Driver retired = new Driver(2L, "Retirado", 3, "", season, team);
        Result result2 = new Result(2L, race, retired, null, 0, 0);
        FantasyPriceDriver fantasyPriceDriver = new FantasyPriceDriver(1L, driver, race, 200);
        FantasyPointsDriver fantasyPointsDriver = new FantasyPointsDriver(1L, driver, race, 5);
        FantasyPriceDriver retiredPrice = new FantasyPriceDriver(2L, retired, race, 200);
        FantasyPointsDriver retiredPoints = new FantasyPointsDriver(2L, retired, race, 0);

        when(resultRepository.findByRaceId(anyInt())).thenReturn(Arrays.asList(result, result2));
        Race next = new Race(2L, "Italia", "", "", LocalDateTime.now().plusDays(7), season, 0);
        when(raceRepository.findById(anyLong())).thenReturn(Optional.of(race));
        when(raceRepository.findBySeason(2)).thenReturn(List.of(race, next));
        when(fantasyPriceDriverRepository.findByRaceId(anyInt())).thenReturn(List.of(fantasyPriceDriver, retiredPrice));
        when(fantasyPointsDriverRepository.findByRaceId(anyInt())).thenReturn(List.of(fantasyPointsDriver, retiredPoints));
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
        verify(fantasyElectionRepository).saveAndFlush(mapped);
    }

    @Test
    void saveFantasyElectionRejectsUnknownPrincipal() {
        ResponseEntity<String> response = fantasyService.saveFantasyElection(validElection(), "desconocido");

        assertEquals(403, response.getStatusCode().value());
        verifyNoInteractions(fantasyElectionRepository, fantasyElectionImpl);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void saveFantasyElectionTranslatesPersistenceConflicts(boolean concurrencyFailure) {
        FantasyElectionDTO input = validElection();
        prepareElection(input);
        RuntimeException failure = concurrencyFailure
                ? new ConcurrencyFailureException("SQL deadlock details")
                : new DataIntegrityViolationException("SQL constraint details");
        when(fantasyElectionRepository.saveAndFlush(any())).thenThrow(failure);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> fantasyService.saveFantasyElection(input, "ana"));

        assertEquals(409, error.getStatusCode().value());
        assertEquals("Tu equipo ya se estaba guardando. Vuelve a intentarlo", error.getReason());
        verify(fantasyElectionRepository).saveAndFlush(any());
    }

    @Test
    void saveFantasyElectionPropagatesUnrelatedFailures() {
        FantasyElectionDTO input = validElection();
        prepareElection(input);
        RuntimeException failure = new IllegalStateException("unexpected");
        when(fantasyElectionRepository.saveAndFlush(any())).thenThrow(failure);

        assertSame(failure, assertThrows(RuntimeException.class,
                () -> fantasyService.saveFantasyElection(input, "ana")));
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
        lenient().when(clock.instant()).thenReturn(Instant.parse("2026-06-02T03:59:59Z"));
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
        verify(fantasyElectionRepository, never()).saveAndFlush(any());
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
        prepareElection(input);
        when(clock.instant()).thenReturn(Instant.parse("2026-06-02T04:00:00Z").plusSeconds(secondsAfter));

        assertElectionRejected(input, 403, "El plazo para guardar tu equipo ha terminado");
    }

    // Literal UTC deadlines: subtract twelve elapsed hours from the Madrid start instant.
    // The March and October windows cross the European DST transitions.
    @ParameterizedTest(name = "Madrid start {0}, UTC deadline {1}")
    @CsvSource({
        "2025-07-06T21:00:00, 2025-07-06T07:00:00Z",
        "2025-01-05T21:00:00, 2025-01-05T08:00:00Z",
        "2025-03-30T10:00:00, 2025-03-29T20:00:00Z",
        "2025-10-26T10:00:00, 2025-10-25T21:00:00Z",
        "2025-03-30T02:30:00, 2025-03-29T13:30:00Z",
        "2025-10-26T02:30:00, 2025-10-25T12:30:00Z"
    })
    void saveFantasyElectionUsesMadridDeadline(String start, String deadline) {
        FantasyElectionDTO input = validElection();
        prepareElection(input).setDateStart(LocalDateTime.parse(start));
        Instant cutoff = Instant.parse(deadline);
        when(clock.instant()).thenReturn(cutoff.minusNanos(1));

        assertEquals(200, fantasyService.saveFantasyElection(input, "ana").getStatusCode().value());
        verify(fantasyElectionRepository).saveAndFlush(any());

        org.junit.jupiter.api.Assertions.assertAll(
                () -> assertMadridDeadlineRejected(input, cutoff),
                () -> assertMadridDeadlineRejected(input, cutoff.plusNanos(1)));
        // Neither rejected submission may write a second election.
        verify(fantasyElectionRepository, times(1)).saveAndFlush(any());
    }

    private void assertMadridDeadlineRejected(FantasyElectionDTO input, Instant now) {
        when(clock.instant()).thenReturn(now);
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> fantasyService.saveFantasyElection(input, "ana"));
        assertEquals(403, error.getStatusCode().value());
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
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> fantasyService.createDriversPoints(List.of(result)));
        assertEquals(422, error.getStatusCode().value());
        org.assertj.core.api.Assertions.assertThat(error.getReason()).contains("Avantifer", "Francia");
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

        int points = fantasyService.createDriversPoints(java.util.Collections.nCopies(15, result)).getFirst().getPoints();

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

        int points = fantasyService.createDriversPoints(java.util.Collections.nCopies(15, result)).getFirst().getPoints();

        assertEquals(17, points);
    }

    @ParameterizedTest
    @CsvSource({"1000000,22", "9999999,22", "10000000,16", "20000000,16", "20000001,12", "30000000,12"})
    void calculatePointsUsesRealPriceBonusBoundaries(int price, int expectedPoints) {
        Driver driver = new Driver();
        driver.setId(1L);
        Race race = new Race(3L, "GP", "", "", LocalDateTime.of(2026, 6, 2, 18, 0), new Season(3L, "Current", 3, 2026), 0);
        Result result = new Result(1L, race, driver, new Position(1L, 1, 25), 0, 0);
        when(fantasyPriceDriverRepository.findByRaceId(3))
                .thenReturn(List.of(new FantasyPriceDriver(1L, driver, race, price)));

        assertEquals(expectedPoints,
                fantasyService.createDriversPoints(java.util.Collections.nCopies(8, result)).getFirst().getPoints());
    }

    @Test
    void createDriversPrices() {
        Season season = new Season(2L, "Temporada 3", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Position position = new Position(1L, 1, 25);
        Driver driver = new Driver(1L, "Avantifer", 2, "", season, team);
        Race race = new Race(1L, "Francia", "", "", LocalDateTime.now(), season, 0);

        Result result = new Result(1L, race, driver, position, 1, 1);
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> fantasyService.createDriversPrices(List.of(result), race));
        assertEquals(422, error.getStatusCode().value());
        org.assertj.core.api.Assertions.assertThat(error.getReason()).contains("Avantifer", "Francia");
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

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> fantasyService.createDriversPrices(List.of(result), race));
        assertEquals(422, error.getStatusCode().value());
        org.assertj.core.api.Assertions.assertThat(error.getReason()).contains("puntos", "Francia");
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

        int actualPrice = fantasyService.createDriversPrices(List.of(result), race).getFirst().getPrice();

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

        when(fantasyPriceImpl.convertFantasyPriceDriverToFantasyPriceDriverDTO(anyList()))
                .thenReturn(Arrays.asList(fantasyPriceDriverDTO, fantasyPriceDriverDTO));

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

        when(fantasyPriceImpl.convertFantasyPriceTeamToFantasyPriceTeamDTO(anyList()))
                .thenReturn(Arrays.asList(fantasyPriceDriverDTO, fantasyPriceDriverDTO));

        List<FantasyPriceTeamDTO> fantasyPriceDriverDTOs = fantasyService.getAllTeamPrices(0);

        assertEquals(2, fantasyPriceDriverDTOs.size());
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

    private static Race raceOn(long id, int day, int finished, Season season) {
        return new Race(id, "GP" + id, "", "", LocalDateTime.of(2025, 3, day, 12, 0), season, finished);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 2})
    void averagesUseTheFinishedRacesBeforeTheRequestedOneAndHandleNone(int finishedBefore) {
        Season season = new Season(2L, "Anterior", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Uno", 2, "", season, team);
        int finished = finishedBefore == 0 ? 0 : 1;
        Race earlier1 = raceOn(1L, 1, finished, season);
        Race earlier2 = raceOn(2L, 8, finished, season);
        Race requested = raceOn(3L, 15, 0, season);
        Race later = raceOn(4L, 22, 1, season); // posterior a la pedida: no cuenta
        SeasonDTO seasonDTO = new SeasonDTO(2L, "Anterior", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Uno", 2, "", seasonDTO, teamDTO);
        RaceDTO raceDTO = new RaceDTO(3L, "GP3", "", "", requested.getDateStart(), seasonDTO, 0);
        when(raceRepository.findById(3L)).thenReturn(Optional.of(requested));
        when(raceRepository.findBySeason(2)).thenReturn(List.of(later, requested, earlier2, earlier1));
        when(fantasyPriceImpl.convertFantasyPriceDriverToFantasyPriceDriverDTO(anyList())).thenReturn(
                new java.util.ArrayList<>(List.of(new FantasyPriceDriverDTO(1L, driverDTO, raceDTO, 1000000, null))));
        when(fantasyPriceImpl.convertFantasyPriceTeamToFantasyPriceTeamDTO(anyList())).thenReturn(
                new java.util.ArrayList<>(List.of(new FantasyPriceTeamDTO(1L, teamDTO, raceDTO, 1000000, null))));
        when(fantasyPointsDriverRepository.findByDriverIdsAndRaceIds(List.of(1L), List.of(1L, 2L)))
                .thenReturn(List.of(new FantasyPointsDriver(1L, driver, earlier1, 10)));
        when(fantasyPointsTeamRepository.findByTeamIdsAndRaceIds(List.of(1L), List.of(1L, 2L)))
                .thenReturn(List.of(new FantasyPointsTeam(1L, team, earlier1, 10)));

        assertEquals(finishedBefore == 0 ? 0 : 5,
                fantasyService.getAllDriverPrices(3).getFirst().getFantasyInfo().getAveragePoints());
        assertEquals(finishedBefore == 0 ? 0 : 5,
                fantasyService.getAllTeamPrices(3).getFirst().getFantasyInfo().getAveragePoints());
    }

    @Test
    void pricesCompareWithThePreviousRaceAndCountOnlyEarlierPoints() {
        Season season = new Season(2L, "Anterior", 2, 2025);
        Team team = new Team(1L, "Haas", "", "", season);
        Driver driver = new Driver(1L, "Uno", 2, "", season, team);
        Race first = raceOn(10L, 1, 1, season);
        Race second = raceOn(11L, 8, 1, season);
        Race third = raceOn(12L, 15, 0, season); // la pedida
        Race fourth = raceOn(13L, 22, 0, season); // futura: ni sus puntos ni su precio cuentan
        SeasonDTO seasonDTO = new SeasonDTO(2L, "Anterior", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Uno", 2, "", seasonDTO, teamDTO);
        RaceDTO raceDTO = new RaceDTO(12L, "GP12", "", "", third.getDateStart(), seasonDTO, 0);
        when(raceRepository.findById(12L)).thenReturn(Optional.of(third));
        when(raceRepository.findBySeason(2)).thenReturn(List.of(fourth, third, first, second));
        when(fantasyPriceImpl.convertFantasyPriceDriverToFantasyPriceDriverDTO(anyList())).thenReturn(
                new java.util.ArrayList<>(List.of(new FantasyPriceDriverDTO(1L, driverDTO, raceDTO, 1200, null))));
        when(fantasyPriceImpl.convertFantasyPriceTeamToFantasyPriceTeamDTO(anyList())).thenReturn(
                new java.util.ArrayList<>(List.of(new FantasyPriceTeamDTO(1L, teamDTO, raceDTO, 2000, null))));
        when(fantasyPriceDriverRepository.findByRaceId(12))
                .thenReturn(List.of(new FantasyPriceDriver(2L, driver, third, 1200)));
        when(fantasyPriceDriverRepository.findByRaceId(11))
                .thenReturn(List.of(new FantasyPriceDriver(1L, driver, second, 1000)));
        when(fantasyPriceTeamRepository.findByRaceId(12))
                .thenReturn(List.of(new FantasyPriceTeam(2L, team, third, 2000)));
        when(fantasyPriceTeamRepository.findByRaceId(11))
                .thenReturn(List.of(new FantasyPriceTeam(1L, team, second, 2500)));
        when(fantasyPointsDriverRepository.findByDriverIdsAndRaceIds(List.of(1L), List.of(10L, 11L))).thenReturn(List.of(
                new FantasyPointsDriver(1L, driver, first, 10), new FantasyPointsDriver(2L, driver, second, 6)));
        when(fantasyPointsTeamRepository.findByTeamIdsAndRaceIds(List.of(1L), List.of(10L, 11L)))
                .thenReturn(List.of(new FantasyPointsTeam(1L, team, first, 30)));

        FantasyInfoDTO driverInfo = fantasyService.getAllDriverPrices(12).getFirst().getFantasyInfo();
        FantasyInfoDTO teamInfo = fantasyService.getAllTeamPrices(12).getFirst().getFantasyInfo();

        assertEquals(16, driverInfo.getTotalPoints());
        assertEquals(8, driverInfo.getAveragePoints());
        assertEquals(20.0, driverInfo.getDifferencePrice(), 0.0001); // 1000 -> 1200
        assertEquals(30, teamInfo.getTotalPoints());
        assertEquals(15, teamInfo.getAveragePoints());
        assertEquals(-20.0, teamInfo.getDifferencePrice(), 0.0001); // 2500 -> 2000
    }

    @Test
    void theFirstRaceOfTheSeasonHasNoPriceChangeAndNoPoints() {
        Season season = new Season(2L, "Anterior", 2, 2025);
        Race first = raceOn(10L, 1, 1, season);
        Race second = raceOn(11L, 8, 0, season);
        SeasonDTO seasonDTO = new SeasonDTO(2L, "Anterior", 2, "2025");
        TeamDTO teamDTO = new TeamDTO(1L, "Haas", "", "", seasonDTO);
        DriverDTO driverDTO = new DriverDTO(1L, "Uno", 2, "", seasonDTO, teamDTO);
        RaceDTO raceDTO = new RaceDTO(10L, "GP10", "", "", first.getDateStart(), seasonDTO, 1);
        when(raceRepository.findById(10L)).thenReturn(Optional.of(first));
        when(raceRepository.findBySeason(2)).thenReturn(List.of(second, first));
        when(fantasyPriceImpl.convertFantasyPriceDriverToFantasyPriceDriverDTO(anyList())).thenReturn(
                new java.util.ArrayList<>(List.of(new FantasyPriceDriverDTO(1L, driverDTO, raceDTO, 1200, null))));

        FantasyInfoDTO info = fantasyService.getAllDriverPrices(10).getFirst().getFantasyInfo();

        assertEquals(0, info.getTotalPoints());
        assertEquals(0, info.getAveragePoints());
        assertEquals(0.0, info.getDifferencePrice(), 0.0001);
        verify(fantasyPriceDriverRepository).findByRaceId(10); // solo sus propios precios, no los de otras carreras
        verifyNoInteractions(fantasyPointsDriverRepository);
    }
}
