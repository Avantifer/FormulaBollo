package formula.bollo.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.hibernate.SessionFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mapstruct.factory.Mappers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import formula.bollo.entity.*;
import formula.bollo.impl.*;
import formula.bollo.mapper.*;
import formula.bollo.model.*;
import formula.bollo.repository.*;
import jakarta.persistence.EntityManager;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:statistics;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.generate_statistics=true",
        "spring.sql.init.mode=never"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Execution(ExecutionMode.SAME_THREAD)
class StatisticsServiceJpaTest {
    @Autowired EntityManager em;
    @Autowired DriverRepository drivers;
    @Autowired TeamRepository teams;
    @Autowired RaceRepository races;
    @Autowired ResultRepository results;
    @Autowired SprintRepository sprints;
    @Autowired PenaltyRepository penalties;
    @Autowired ChampionshipRepository championships;
    @Autowired ConstructorRepository constructors;

    StatisticsService service;
    DriverService driverService;
    TeamService teamService;
    final JsonMapper json = JsonMapper.builder().findAndAddModules().build();

    @BeforeEach
    void createServices() {
        DriverImpl driverMapper = new DriverImpl(Mappers.getMapper(DriverMapper.class));
        TeamImpl teamMapper = new TeamImpl(Mappers.getMapper(TeamMapper.class));
        ResultImpl resultMapper = new ResultImpl(Mappers.getMapper(ResultMapper.class));
        RaceImpl raceMapper = new RaceImpl(Mappers.getMapper(RaceMapper.class));
        driverService = new DriverService(results, championships, penalties, sprints, driverMapper,
                teamMapper, resultMapper, null, raceMapper,
                new ResultService(results, sprints, resultMapper, driverMapper));
        teamService = new TeamService(results, sprints, drivers, constructors, teams, teamMapper,
                driverMapper, resultMapper, raceMapper, driverService);
        service = new StatisticsService(drivers, teams, races, results, sprints, penalties,
                driverService, teamService);
    }

    @Test
    void referenceDriversMatchDataJsonIncludingRobeDuplicates() throws Exception {
        JsonNode fixture;
        try (InputStream input = getClass().getResourceAsStream("/statistics/reference-drivers.json")) {
            fixture = json.readTree(input);
        }
        loadReference(fixture);
        flushAndClear();

        StatisticsOverviewDTO overview = service.getOverview(0);
        for (JsonNode expected : fixture.get("expected")) {
            DriverStatsDTO actual = driver(overview, expected.get("name").asText());
            JsonNode actualJson = json.valueToTree(actual);
            for (String field : List.of("races", "dnfs", "poleWins", "hatTricks", "podiumStreak",
                    "winStreak", "currentPodiumStreak", "posStd")) {
                assertThat(actualJson.get(field)).as(actual.getDriver().getName() + "." + field)
                        .isEqualTo(expected.get(field));
            }
            assertThat(actualJson.get("positionDistribution")).isEqualTo(expected.get("posDist"));
            assertThat(actual.getPenaltiesBy().getWarning()).isEqualTo(expected.get("penaltiesBy").get("Aviso").asInt());
            assertThat(actual.getPenaltiesBy().getMinor()).isEqualTo(expected.get("penaltiesBy").get("Leve").asInt());
            assertThat(actual.getPenaltiesBy().getSerious()).isEqualTo(expected.get("penaltiesBy").get("Grave").asInt());
            assertThat(java.util.Arrays.stream(actual.getPositionDistribution()).sum()).isEqualTo(actual.getRaces());
        }
        DriverStatsDTO smoking = driver(overview, "SmokingWeed");
        assertThat(Math.round(1000d * smoking.getDnfs() / smoking.getRaces()) / 1000d).isEqualTo(0.132);
        assertThat(driver(overview, "Robe").getRaces()).isEqualTo(68);
        assertLegacyFields(0, overview);
        assertThat(overview.getDriverEvolution().getSeries()).allSatisfy(series -> {
            DriverStatsDTO stats = driver(overview, series.getDriver().getName());
            assertThat(series.getCumulative().getLast()).isEqualTo(stats.getTotalPoints());
            assertThat(stats.getPointsBySeason().values().stream().mapToInt(Integer::intValue).sum())
                    .isEqualTo(stats.getTotalPoints());
        });
    }

    @Test
    void streaksCrossSeasonsFollowDatesAndIdsAndIgnoreMissingRows() {
        Season first = season(1);
        Season second = season(2);
        Driver old = driver("Ana", team("Team", first));
        Driver latest = driver("Ana", team("Team", second));
        Position winner = position(1, 25);
        Position secondPlace = position(2, 18);
        Race laterId = race(second, 3, 1);
        Race earlier = race(first, 1, 1);
        Race dateTie = race(second, 3, 1);
        Race missing = race(first, 2, 1);
        Race dnf = race(second, 4, 1);
        Race last = race(first, 5, 1);
        result(latest, laterId, winner, 1, 1);
        result(old, earlier, winner, 0, 1);
        result(latest, dateTie, secondPlace, 0, 0);
        result(latest, dnf, null, 0, 0);
        result(old, last, secondPlace, 0, 0);
        flushAndClear();

        StatisticsOverviewDTO overview = service.getOverview(0);
        DriverStatsDTO stats = driver(overview, "Ana");
        assertThat(stats.getDriver().getSeason().getNumber()).isEqualTo(2);
        assertThat(stats.getWinStreak()).isEqualTo(2);
        assertThat(stats.getPodiumStreak()).isEqualTo(3);
        assertThat(stats.getCurrentPodiumStreak()).isEqualTo(1);
        assertThat(stats.getPoleWins()).isEqualTo(2);
        assertThat(stats.getHatTricks()).isEqualTo(1);
        assertThat(stats.getPosStd()).isNull();
        assertThat(stats.getPositionDistribution()).startsWith(2, 2);
        assertThat(stats.getPositionDistribution()[20]).isEqualTo(1);
        assertThat(overview.getDriverEvolution().getRaces()).extracting(StatisticsRaceDTO::getId)
                .containsExactly(earlier.getId(), missing.getId(), laterId.getId(), dateTie.getId(),
                        dnf.getId(), last.getId());
        assertThat(overview.getDriverEvolution().getSeries().getFirst().getCumulative())
                .containsExactly(25, 25, 51, 69, 69, 87);
        assertThat(overview.getSummary().getPoleWinRate()).isEqualTo(100.0);
        assertThat(overview.getSummary().getDnfRate()).isEqualTo(0.2);
        assertThat(overview.getSummary().getMargin()).isZero();
    }

    @Test
    void deduplicationPrefersFinishThenSeasonTeamFrequencyThenId() {
        Season season = season(3);
        Team ferrari = team("Ferrari", season);
        Team sauber = team("Kick Sauber", season);
        Driver placeholder = driver("Robe", ferrari);
        Driver actual = driver("Robe", sauber);
        Driver tiedFirst = driver("Tie", ferrari);
        Driver tiedSecond = driver("Tie", sauber);
        Position winner = position(1, 25);
        Race one = race(season, 1, 1);
        Race two = race(season, 2, 1);
        Race three = race(season, 3, 1);
        result(placeholder, one, null, 0, 1);
        result(actual, one, winner, 1, 1);
        result(placeholder, two, null, 0, 0);
        result(actual, two, null, 0, 0);
        result(actual, three, null, 0, 0);
        result(tiedFirst, three, null, 0, 0);
        result(tiedSecond, three, null, 0, 0);
        flushAndClear();

        StatisticsOverviewDTO overview = service.getOverview(3);
        DriverStatsDTO robe = driver(overview, "Robe");
        assertThat(robe.getRaces()).isEqualTo(3);
        assertThat(robe.getDnfs()).isEqualTo(2);
        assertThat(robe.getPoles()).isEqualTo(2);
        assertThat(robe.getPoleWins()).isEqualTo(1);
        assertThat(robe.getHatTricks()).isEqualTo(1);
        assertThat(team(overview, "Ferrari").getRaces()).isEqualTo(1);
        assertThat(team(overview, "Kick Sauber").getRaces()).isEqualTo(3);
        assertThat(overview.getSummary().getPoleWinRate()).isEqualTo(100.0);
        assertThat(overview.getSummary().getDnfRate()).isEqualTo(0.75);
        assertThat(overview.getTeamEvolution().getSeries()).filteredOn(s -> s.getTeam().getName().equals("Ferrari"))
                .singleElement().satisfies(s -> assertThat(s.getCumulative()).containsExactly(0, 0, 0));
        assertLegacyFields(3, overview);
    }

    @Test
    void duelsDoublePointsAndPodiumsUseTheTwoMostFrequentTeammates() {
        Season season = season(1);
        Team team = team("Team", season);
        Driver a = driver("Ana", team);
        Driver b = driver("Bea", team);
        Driver reserve = driver("Zoe", team);
        Position winner = position(1, 25);
        Position second = position(2, 18);
        Position third = position(3, 15);
        Position fifth = position(5, 0);
        Position[] aPositions = {winner, null, null, second, fifth, winner};
        Position[] bPositions = {second, third, null, second, null};
        for (int index = 0; index < 6; index++) {
            Race race = race(season, index + 1, 1);
            result(a, race, aPositions[index], 0, 0);
            if (index < 5)
                result(b, race, bPositions[index], 0, 0);
            else
                result(reserve, race, third, 0, 0);
        }
        flushAndClear();

        TeamStatsDTO stats = service.getOverview(1).getTeams().getFirst();
        assertThat(stats.getRaces()).isEqualTo(12);
        assertThat(stats.getDnfs()).isEqualTo(4);
        assertThat(stats.getDoublePoints()).isEqualTo(3);
        assertThat(stats.getDoublePodiums()).isEqualTo(3);
        assertThat(stats.getDrivers()).extracting(TeamDriverStatsDTO::getName).containsExactly("Ana", "Bea");
        assertThat(stats.getDrivers()).extracting(TeamDriverStatsDTO::getPoints).containsExactly(68, 51);
        assertThat(stats.getDuels()).singleElement().satisfies(duel -> {
            assertThat(duel.getA()).isEqualTo("Ana");
            assertThat(duel.getB()).isEqualTo("Bea");
            assertThat(duel.getAAhead()).isEqualTo(2);
            assertThat(duel.getBAhead()).isEqualTo(1);
            assertThat(duel.getTied()).isEqualTo(1);
            assertThat(duel.getSeason()).isEqualTo(1);
        });
        assertThat(stats.getPointsShare()).isEqualTo(100.0);
    }

    @Test
    void populationDeviationRequiresEightFinishes() {
        Season season = season(1);
        Driver a = driver("Ana", team("Team", season));
        for (int index = 1; index <= 7; index++)
            result(a, race(season, index, 1), position(index, 0), 0, 0);
        flushAndClear();
        assertThat(service.getOverview(1).getDrivers().getFirst().getPosStd()).isNull();
        Driver managed = drivers.findById(a.getId()).orElseThrow();
        result(managed, race(managed.getSeason(), 8, 1), position(8, 0), 0, 0);
        flushAndClear();
        assertThat(service.getOverview(1).getDrivers().getFirst().getPosStd()).isEqualTo(2.3);
    }

    @Test
    void evolutionIncludesSprintsAndOnlyFinishedRacesAndAllDriversOrderedByPointsWithNameTies() {
        Season season = season(1);
        Team alpha = team("Alpha", season);
        Team beta = team("Beta", season);
        Race first = race(season, 1, 1);
        Race second = race(season, 2, 1);
        race(season, 3, 0);
        Position position = position(1, 25);
        SprintPosition sprintPosition = persist(new SprintPosition(null, 1, 8));
        for (int index = 0; index < 10; index++) {
            Driver driver = driver("Driver " + index, index % 2 == 0 ? alpha : beta);
            result(driver, first, position, 0, 0);
            result(driver, second, index == 9 ? null : position, index == 9 ? 1 : 0, 0);
            if (index == 0)
                persist(new Sprint(null, first, driver, sprintPosition));
        }
        flushAndClear();

        StatisticsOverviewDTO overview = service.getOverview(1);
        assertThat(overview.getSummary().getRaceCount()).isEqualTo(3);
        assertThat(overview.getSummary().getFinishedRaces()).isEqualTo(2);
        assertThat(overview.getSummary().getDistinctWinners()).isEqualTo(10);
        assertThat(overview.getSummary().getPoleWinRate()).isNull();
        assertThat(overview.getSummary().getDnfRate()).isEqualTo(0.05);
        assertThat(overview.getSummary().getMargin()).isEqualTo(8);
        assertThat(overview.getDrivers()).extracting(dto -> dto.getDriver().getName())
                .containsExactly("Driver 0", "Driver 1", "Driver 2", "Driver 3", "Driver 4",
                        "Driver 5", "Driver 6", "Driver 7", "Driver 8", "Driver 9");
        assertThat(overview.getDriverEvolution().getSeries()).extracting(series -> series.getDriver().getName())
                .containsExactly("Driver 0", "Driver 1", "Driver 2", "Driver 3", "Driver 4",
                        "Driver 5", "Driver 6", "Driver 7", "Driver 8", "Driver 9");
        assertThat(overview.getDriverEvolution().getSeries().getFirst().getCumulative()).containsExactly(33, 58);
        assertThat(overview.getDriverEvolution().getSeries()).filteredOn(series -> series.getDriver().getName().equals("Driver 9"))
                .singleElement().satisfies(series -> assertThat(series.getCumulative()).containsExactly(25, 25));
        assertThat(overview.getDriverEvolution().getSeries()).allSatisfy(series ->
                assertThat(series.getCumulative().getLast()).isEqualTo(driver(overview, series.getDriver().getName()).getTotalPoints()));
        assertThat(overview.getTeamEvolution().getSeries()).hasSize(2).allSatisfy(series ->
                assertThat(series.getCumulative().getLast()).isEqualTo(team(overview, series.getTeam().getName()).getTotalPoints()));
        assertThat(overview.getTeams().stream().mapToDouble(TeamStatsDTO::getPointsShare).sum()).isCloseTo(100d,
                org.assertj.core.data.Offset.offset(0.1));
        assertThat(overview.getTeams().getFirst().getPointsBySeason()).containsEntry(1, 258);
    }

    @Test
    void missingSeasonReturnsEmptyCollectionsAndZeroSummary() {
        seedTeams(1);
        flushAndClear();
        StatisticsOverviewDTO overview = service.getOverview(99);
        assertThat(overview.getSeason()).isEqualTo(99);
        assertThat(overview.getDrivers()).isEmpty();
        assertThat(overview.getTeams()).isEmpty();
        assertThat(overview.getDriverEvolution().getRaces()).isEmpty();
        assertThat(overview.getDriverEvolution().getSeries()).isEmpty();
        assertThat(overview.getTeamEvolution().getSeries()).isEmpty();
        assertThat(overview.getSummary()).isEqualTo(new StatisticsSummaryDTO(0, 0, 0, null, 0, 0));
    }

    @Test
    void negativeSeasonUsesTotalAndVacanciesAreIncludedWithoutPoints() {
        Season season = season(1);
        Driver vacant = driver("VaCaNtE12", team("Team", season));
        result(vacant, race(season, 1, 1), null, 0, 0);
        flushAndClear();
        StatisticsOverviewDTO overview = service.getOverview(-1);
        assertThat(overview.getSeason()).isEqualTo(-1);
        assertThat(overview.getDrivers()).singleElement().satisfies(dto -> {
            assertThat(dto.getDriver().getName()).isEqualTo("VaCaNtE12");
            assertThat(dto.getDnfs()).isEqualTo(1);
            assertThat(dto.getWinStreak()).isZero();
            assertThat(dto.getCurrentPodiumStreak()).isZero();
        });
        assertThat(overview.getTeams().getFirst().getPointsShare()).isZero();
        assertThat(overview.getTeams().getFirst().getDuels()).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 10})
    void queryCountIsFixedRegardlessOfDriverAndTeamCount(int count) {
        seedTeams(count);
        flushAndClear();
        var statistics = em.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        StatisticsOverviewDTO overview = service.getOverview(0);
        json.writeValueAsString(overview);
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(17);
        System.out.println("statistics/overview: " + count + " teams, "
                + statistics.getPrepareStatementCount() + " SELECTs");
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 2})
    void existingFieldsAndSeasonPointsMatchLegacyServices(int scope) {
        seedTeams(3);
        Season second = season(2);
        Team team = team("Team 0", second);
        Driver a = driver("Ana 0", team);
        result(a, race(second, 1, 1), position(2, 18), 1, 1);
        flushAndClear();
        StatisticsOverviewDTO overview = service.getOverview(scope);
        assertLegacyFields(scope, overview);
        assertThat(overview.getDrivers()).allSatisfy(dto ->
                assertThat(dto.getPointsBySeason().values().stream().mapToInt(Integer::intValue).sum())
                        .isEqualTo(dto.getTotalPoints()));
        assertThat(overview.getTeams()).allSatisfy(dto ->
                assertThat(dto.getPointsBySeason().values().stream().mapToInt(Integer::intValue).sum())
                        .isEqualTo(dto.getTotalPoints()));
        if (scope == 0)
            assertThat(driver(overview, "Ana 0").getPointsBySeason()).containsEntry(1, 26).containsEntry(2, 19);
    }

    private void assertLegacyFields(int season, StatisticsOverviewDTO overview) {
        List<String> fields = List.of("poles", "fastlaps", "racesFinished", "totalPoints", "penalties",
                "victories", "podiums", "averagePosition");
        var oldDrivers = driverService.sumDuplicates(driverService.getAllInfoDrivers(
                season == 0 ? drivers.findAll() : drivers.findAllBySeason(season)));
        oldDrivers.forEach(expected -> {
            JsonNode actual = json.valueToTree(driver(overview, expected.getDriver().getName()));
            JsonNode legacy = json.valueToTree(expected);
            for (String field : fields)
                assertThat(actual.get(field)).as(expected.getDriver().getName() + "." + field).isEqualTo(legacy.get(field));
            assertThat(actual.get("driver")).isEqualTo(legacy.get("driver"));
        });
        var oldTeams = teamService.sumDuplicates(teamService.getAllInfoTeams(
                season == 0 ? teams.findAll() : teams.findBySeason(season)));
        oldTeams.forEach(expected -> {
            JsonNode actual = json.valueToTree(team(overview, expected.getTeam().getName()));
            JsonNode legacy = json.valueToTree(expected);
            for (String field : fields)
                assertThat(actual.get(field)).as(expected.getTeam().getName() + "." + field).isEqualTo(legacy.get(field));
        });
    }

    private void loadReference(JsonNode fixture) {
        Map<String, Position> positions = new HashMap<>();
        Map<String, SprintPosition> sprintPositions = new HashMap<>();
        Map<String, PenaltySeverity> severities = new HashMap<>();
        for (JsonNode seasonNode : fixture.get("seasons")) {
            Season season = persist(new Season(null, "Season " + seasonNode.get("number").asInt(),
                    seasonNode.get("number").asInt(), seasonNode.get("year").asInt()));
            Map<String, Team> seasonTeams = new HashMap<>();
            Map<String, Driver> seasonDrivers = new HashMap<>();
            for (JsonNode raceNode : seasonNode.get("races")) {
                Race race = persist(new Race(null, raceNode.get("name").asText(), "", "",
                        LocalDateTime.parse(raceNode.get("date").asText()), season, raceNode.get("finished").asInt()));
                for (JsonNode row : raceNode.get("results")) {
                    Driver driver = referenceDriver(row, season, seasonTeams, seasonDrivers);
                    Position position = row.get(2).isNull() ? null : positions.computeIfAbsent(
                            row.get(2).asInt() + ":" + row.get(3).asInt(),
                            key -> position(row.get(2).asInt(), row.get(3).asInt()));
                    result(driver, race, position, row.get(4).asInt(), row.get(5).asInt());
                }
                for (JsonNode row : raceNode.get("sprints")) {
                    Driver driver = referenceDriver(row, season, seasonTeams, seasonDrivers);
                    SprintPosition position = row.get(2).isNull() ? null : sprintPositions.computeIfAbsent(
                            row.get(2).asInt() + ":" + row.get(3).asInt(),
                            key -> persist(new SprintPosition(null, row.get(2).asInt(), row.get(3).asInt())));
                    persist(new Sprint(null, race, driver, position));
                }
                for (JsonNode row : raceNode.get("penalties")) {
                    Driver driver = seasonDrivers.values().stream().filter(d -> d.getName().equals(row.get(0).asText()))
                            .findFirst().orElseThrow();
                    PenaltySeverity severity = severities.computeIfAbsent(row.get(1).asText(),
                            name -> persist(new PenaltySeverity(null, name)));
                    persist(new Penalty(null, race, driver, "Penalty", severity, season));
                }
            }
        }
    }

    private Driver referenceDriver(JsonNode row, Season season, Map<String, Team> seasonTeams,
            Map<String, Driver> seasonDrivers) {
        Team team = seasonTeams.computeIfAbsent(row.get(1).asText(), name -> team(name, season));
        return seasonDrivers.computeIfAbsent(row.get(0).asText() + ":" + team.getName(),
                key -> driver(row.get(0).asText(), team));
    }

    private void seedTeams(int count) {
        Season season = season(1);
        Race race = race(season, 1, 1);
        Position position = position(1, 25);
        for (int index = 0; index < count; index++) {
            Team team = team("Team " + index, season);
            result(driver("Ana " + index, team), race, position, 1, 1);
            result(driver("Bea " + index, team), race, null, 0, 0);
        }
    }

    private DriverStatsDTO driver(StatisticsOverviewDTO overview, String name) {
        return overview.getDrivers().stream().filter(dto -> dto.getDriver().getName().equals(name)).findFirst().orElseThrow();
    }

    private TeamStatsDTO team(StatisticsOverviewDTO overview, String name) {
        return overview.getTeams().stream().filter(dto -> dto.getTeam().getName().equals(name)).findFirst().orElseThrow();
    }

    private Season season(int number) {
        return persist(new Season(null, "Season " + number, number, 2023 + number));
    }

    private Team team(String name, Season season) {
        return persist(new Team(null, name, "", "", season));
    }

    private Driver driver(String name, Team team) {
        return persist(new Driver(null, name, 1, "", team.getSeason(), team));
    }

    private Race race(Season season, int day, int finished) {
        return persist(new Race(null, "Race " + day, "", "", LocalDateTime.of(2026, 1, day, 12, 0), season, finished));
    }

    private Position position(int number, int points) {
        return persist(new Position(null, number, points));
    }

    private Result result(Driver driver, Race race, Position position, int fastlap, int pole) {
        return persist(new Result(null, race, driver, position, fastlap, pole));
    }

    private void flushAndClear() {
        em.flush();
        em.clear();
    }

    private <T> T persist(T entity) {
        em.persist(entity);
        return entity;
    }
}
