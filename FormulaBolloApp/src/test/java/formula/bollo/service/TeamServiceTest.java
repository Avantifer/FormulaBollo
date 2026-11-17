package formula.bollo.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mapstruct.factory.Mappers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import formula.bollo.entity.*;
import formula.bollo.enums.PositionChange;
import formula.bollo.impl.*;
import formula.bollo.model.*;
import formula.bollo.repository.*;
import formula.bollo.mapper.*;

@ExtendWith(MockitoExtension.class)
class TeamServiceTest {

    @Test
    void latestRaceUsesDateAndStableIdWithUnorderedResults() {
        Season season = new Season(1L, "Season", 1, 2026);
        Team team = new Team(1L, "Team", "", "", season);
        Driver driver = new Driver(1L, "Driver", 1, "", season, team);
        LocalDateTime date = LocalDateTime.of(2026, 2, 1, 0, 0);
        Race latest = new Race(3L, "Latest", "", "", date, season, 1);
        Race tied = new Race(2L, "Tied", "", "", date, season, 1);
        Race older = new Race(99L, "Older", "", "", date.minusDays(1), season, 1);
        when(resultRepository.findByDriverIds(List.of(1L))).thenReturn(List.of(
                new Result(1L, latest, driver, null, 0, 0), new Result(2L, tied, driver, null, 0, 0),
                new Result(3L, older, driver, null, 0, 0)));
        when(teamImpl.teamToTeamDTO(team)).thenReturn(new TeamDTO(1L, "Team", "", "", null));

        teamService.getTeamWithDriversDTO(List.of(driver));

        org.mockito.Mockito.verify(resultRepository).findByRaceId(3);
        org.mockito.Mockito.verify(sprintRepository).findByRaceId(3);
    }

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
    private TeamRepository teamRepository;
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
    void getAllInfoTeamsEmptyDoesNotReadRepositories() {
        assertEquals(List.of(), teamService.getAllInfoTeams(List.of()));
        verifyNoInteractions(resultRepository, sprintRepository, driverRepository, constructorRepository,
                teamRepository, driverService);
    }

    @ParameterizedTest
    @ValueSource(ints = { 0, 1, 2, 3 })
    void getAllInfoTeamsMatchesSingletonsIncludingEmptyTeamsAndRetirements(int season) {
        BatchFixture fixture = new BatchFixture();
        List<Team> teams = fixture.teams.stream()
                .filter(team -> season == 0 || team.getSeason().getNumber() == season).toList();
        // A deliberately different order from the bulk repository response.
        teams = new ArrayList<>(teams);
        Collections.reverse(teams);
        List<TeamInfoDTO> expected = teams.stream().map(team -> fixture.service.getAllInfoTeam(List.of(team))).toList();
        List<TeamInfoDTO> actual = fixture.service.getAllInfoTeams(teams);

        assertEquals(expected, actual);
        assertEquals(fixture.service.sumDuplicates(expected), fixture.service.sumDuplicates(actual));
        assertTrue(actual.stream().anyMatch(info -> info.getLast5Results() == null));
        assertTrue(actual.stream().anyMatch(info -> List.of().equals(info.getLast5Results())));
    }

    @ParameterizedTest
    @ValueSource(ints = { 1, 5 })
    void getAllInfoTeamsRepositoryCallsAreConstant(int teamCount) {
        BatchFixture fixture = new BatchFixture();
        List<Team> teams = fixture.teams.subList(0, teamCount);
        List<Long> teamIds = teams.stream().map(Team::getId).toList();
        List<Long> driverIds = fixture.drivers.stream().filter(driver -> teamIds.contains(driver.getTeam().getId()))
                .map(Driver::getId).toList();

        assertEquals(teamCount, fixture.service.getAllInfoTeams(teams).size());

        verify(fixture.teamsRepository, times(1)).findWithSeasonByIdIn(teamIds);
        verify(fixture.constructors, times(1)).countByTeam(teamIds);
        verify(fixture.driversRepository, times(1)).findByTeamIdIn(teamIds);
        verify(fixture.resultsRepository, times(1)).findForTeamInfoByDriverIds(driverIds);
        verify(fixture.sprintsRepository, times(1)).findWithPositionByDriverIds(driverIds);
        verify(fixture.penalties, times(1)).countByDriver(driverIds);
        verify(fixture.championships, times(1)).countByDriver(driverIds);
        verifyNoMoreInteractions(fixture.teamsRepository, fixture.constructors, fixture.driversRepository,
                fixture.resultsRepository, fixture.sprintsRepository, fixture.penalties, fixture.championships);
    }

    @Test
    void getAllInfoTeamsLimitsRowsBeforeGroupingAndKeepsRetirementsWithFinishers() {
        BatchFixture fixture = new BatchFixture();
        Team team = fixture.teams.getFirst();
        List<Driver> drivers = fixture.drivers.stream().filter(driver -> driver.getTeam().equals(team)).toList();
        fixture.results.clear();
        for (int raceNumber = 0; raceNumber < 7; raceNumber++) {
            Race race = new Race((long) raceNumber + 1, "Race " + raceNumber, "", "",
                    LocalDateTime.of(2026, 1, 1, 0, 0).plusDays(raceNumber / 2), team.getSeason(), 1);
            for (Driver driver : drivers) {
                fixture.results.add(new Result((long) fixture.results.size() + 1, race, driver,
                        driver == drivers.getFirst() ? new Position(1L, 1, 25) : null, 1, 1));
            }
        }

        TeamInfoDTO expected = fixture.service.getAllInfoTeam(List.of(team));
        TeamInfoDTO actual = fixture.service.getAllInfoTeams(List.of(team)).getFirst();

        assertEquals(expected, actual);
        assertEquals(4, actual.getLast5Results().size());
        assertEquals(15, actual.getLast5Results().stream().mapToInt(race -> race.getResults().size()).sum());
        assertTrue(actual.getLast5Results().stream().flatMap(race -> race.getResults().stream())
                .anyMatch(result -> result.getPosition() == null));
    }

    /** Real calculators and mappers; only database access is mocked. */
    private static class BatchFixture {
        final TeamRepository teamsRepository = mock(TeamRepository.class);
        final DriverRepository driversRepository = mock(DriverRepository.class);
        final ConstructorRepository constructors = mock(ConstructorRepository.class);
        final ResultRepository resultsRepository = mock(ResultRepository.class);
        final SprintRepository sprintsRepository = mock(SprintRepository.class);
        final PenaltyRepository penalties = mock(PenaltyRepository.class);
        final ChampionshipRepository championships = mock(ChampionshipRepository.class);
        final List<Team> teams = new ArrayList<>();
        final List<Driver> drivers = new ArrayList<>();
        final List<Result> results = new ArrayList<>();
        final List<Sprint> sprints = new ArrayList<>();
        final TeamService service;

        BatchFixture() {
            TeamImpl teamMapper = new TeamImpl(Mappers.getMapper(TeamMapper.class));
            DriverImpl driverMapper = new DriverImpl(Mappers.getMapper(DriverMapper.class));
            ResultImpl resultMapper = new ResultImpl(Mappers.getMapper(ResultMapper.class));
            RaceImpl raceMapper = new RaceImpl(Mappers.getMapper(RaceMapper.class));
            DriverService driverCalculator = new DriverService(resultsRepository, championships, penalties,
                    sprintsRepository, driverMapper, teamMapper, resultMapper, null, raceMapper,
                    new ResultService(resultsRepository, sprintsRepository, resultMapper, driverMapper));
            service = new TeamService(resultsRepository, sprintsRepository, driversRepository, constructors,
                    teamsRepository, teamMapper, driverMapper, resultMapper, raceMapper, driverCalculator);
            for (int seasonNumber = 1; seasonNumber <= 3; seasonNumber++) {
                Season season = new Season((long) seasonNumber, "Season " + seasonNumber, seasonNumber, 2026);
                for (int kind = 0; kind < 5; kind++) {
                    Team team = new Team((long) teams.size() + 1, "Team " + kind, "car", "logo", season);
                    teams.add(team);
                    if (kind == 3) // no drivers
                        continue;
                    for (int number = 0; number < (kind == 0 ? 4 : 1); number++) {
                        Driver driver = new Driver((long) drivers.size() + 1, "Driver " + number, number, "", season, team);
                        drivers.add(driver);
                        if (kind == 2) // driver without results
                            continue;
                        Race race = new Race((long) seasonNumber, "Race", "", "",
                                LocalDateTime.of(2026, seasonNumber, 1, 0, 0), season, 1);
                        results.add(new Result((long) results.size() + 1, race, driver,
                                kind == 1 || number == 1 ? null : new Position(1L, number + 1, 25 - number), 1, 1));
                        sprints.add(new Sprint((long) sprints.size() + 1, race, driver,
                                number == 1 ? null : new SprintPosition(1L, 1, 8)));
                    }
                }
            }
            lenient().when(teamsRepository.findWithSeasonByIdIn(anyList())).thenAnswer(call -> teams.stream()
                    .filter(team -> call.<List<Long>>getArgument(0).contains(team.getId())).toList());
            lenient().when(driversRepository.findByTeamIdIn(anyList())).thenAnswer(call -> drivers.stream()
                    .filter(driver -> call.<List<Long>>getArgument(0).contains(driver.getTeam().getId())).toList());
            lenient().when(driversRepository.findByTeamId(any())).thenAnswer(call -> drivers.stream()
                    .filter(driver -> driver.getTeam().getId().equals(call.getArgument(0))).toList());
            lenient().when(constructors.countByTeam(anyList())).thenAnswer(call -> teams.stream()
                    .filter(team -> call.<List<Long>>getArgument(0).contains(team.getId()) && team.getId() % 2 == 1)
                    .map(team -> new Object[] { team.getId(), 2L }).toList());
            lenient().when(constructors.findByTeamId(anyList())).thenAnswer(call ->
                    call.<List<Long>>getArgument(0).stream().mapToInt(id -> id % 2 == 1 ? 2 : 0).sum());
            lenient().when(resultsRepository.findForTeamInfoByDriverIds(anyList())).thenAnswer(call -> results.stream()
                    .filter(result -> call.<List<Long>>getArgument(0).contains(result.getDriver().getId())).toList());
            lenient().when(resultsRepository.findWithRaceAndPositionByDriverIds(anyList())).thenAnswer(call -> results.stream()
                    .filter(result -> call.<List<Long>>getArgument(0).contains(result.getDriver().getId())).toList());
            lenient().when(sprintsRepository.findWithPositionByDriverIds(anyList())).thenAnswer(call -> sprints.stream()
                    .filter(sprint -> call.<List<Long>>getArgument(0).contains(sprint.getDriver().getId())).toList());
            lenient().when(sprintsRepository.findByDriverIds(anyList())).thenAnswer(call -> sprints.stream()
                    .filter(sprint -> call.<List<Long>>getArgument(0).contains(sprint.getDriver().getId())).toList());
            lenient().when(penalties.countByDriver(anyList())).thenAnswer(call -> call.<List<Long>>getArgument(0).stream()
                    .filter(id -> id % 2 == 1).map(id -> new Object[] { id, 2L }).toList());
            lenient().when(penalties.findByDriverIds(anyList())).thenAnswer(call ->
                    (int) call.<List<Long>>getArgument(0).stream().filter(id -> id % 2 == 1).count() * 2);
            lenient().when(championships.countByDriver(anyList())).thenAnswer(call -> call.<List<Long>>getArgument(0).stream()
                    .filter(id -> id % 3 == 0).map(id -> new Object[] { id, 1L }).toList());
            lenient().when(championships.findByDriverIds(anyList())).thenAnswer(call ->
                    (int) call.<List<Long>>getArgument(0).stream().filter(id -> id % 3 == 0).count());
            lenient().when(resultsRepository.last5ResultsByTeamIds(anyList())).thenAnswer(call -> {
                List<Result> matching = results.stream()
                        .filter(result -> call.<List<Long>>getArgument(0).contains(result.getDriver().getTeam().getId())).toList();
                return matching.stream().filter(result -> matching.stream().anyMatch(other ->
                                other.getRace().getId().equals(result.getRace().getId()) && other.getPosition() != null))
                        .sorted(Comparator.comparing((Result result) -> result.getRace().getDateStart())
                                .thenComparing(Result::getId).reversed()).limit(15).toList();
            });
        }
    }

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
    void sumDuplicatesIgnoresAZeroBestPositionWeightsTheAverageAndMergesLastRaces() {
        TeamDTO team1 = new TeamDTO(1L, "Alpine", "", "", null);
        TeamDTO team2 = new TeamDTO(2L, "Alpine", "", "", null);
        TeamDTO team3 = new TeamDTO(3L, "Alpine", "", "", null);
        // Una temporada sin resultados (mejor 0), otra con 20 carreras (mejor 3, media 10,0) y otra con 5 (mejor 1, media 4,0).
        TeamInfoDTO empty = new TeamInfoDTO(team1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0, List.of());
        TeamInfoDTO first = new TeamInfoDTO(team2, 0, 0, 20, 0, 0, 0, 3, 0, 0, 10.0,
                List.of(raceGroup(1L, 2024, 3), raceGroup(2L, 2024, 2)));
        TeamInfoDTO second = new TeamInfoDTO(team3, 0, 0, 5, 0, 0, 0, 1, 0, 0, 4.0,
                List.of(raceGroup(3L, 2024, 5), raceGroup(4L, 2024, 4)));

        TeamInfoDTO merged = teamService.sumDuplicates(List.of(empty, first, second)).get(0);

        assertEquals(1, merged.getBestPosition());
        assertEquals(25, merged.getRacesFinished());
        assertEquals(8.8, merged.getAveragePosition(), 0.0001); // (10,0 * 20 + 4,0 * 5) / 25
        assertEquals(List.of(3L, 4L, 1L, 2L),
                merged.getLast5Results().stream().map(group -> group.getRace().getId()).toList());
    }

    private static ResultTeamDTO raceGroup(long id, int year, int month) {
        return new ResultTeamDTO(new RaceDTO(id, "GP", "", "", LocalDateTime.of(year, month, 1, 12, 0), null, 1),
                List.of(), 0, 0, 0);
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
