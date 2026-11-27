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
        driverService = new DriverService(results, championships, penalties, sprints, driverMapper, resultMapper,
                new ResultService(results, sprints, resultMapper, driverMapper));
        teamService = new TeamService(results, sprints, drivers, constructors, teams, teamMapper,
                driverMapper, resultMapper, driverService);
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
        Race dateTie = persist(new Race(null, "Date tie", "", "", laterId.getDateStart(), second, 1));
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

    @Test
    void headToHeadCountsFinishesDnfsTiesAndCommonRacePointsInChronologicalOrder() {
        Season season = season(3);
        Team team = team("Team", season);
        Driver a = driver("Ana", team);
        Driver b = driver("Bea", team);
        Driver duplicate = driver("Ana", team("Other", season));
        Position winner = position(1, 25);
        Position second = position(2, 18);
        SprintPosition sprintWinner = persist(new SprintPosition(null, 1, 8));
        Race later = race(season, 2, 1);
        Race first = race(season, 1, 1);
        Race sameDate = persist(new Race(null, "Same date", "", "", later.getDateStart(), season, 1));
        Race bFinishes = race(season, 3, 1);
        Race bothDnf = race(season, 4, 1);
        Race tied = race(season, 5, 1);
        Race unfinished = race(season, 6, 0);
        Race onlyA = race(season, 7, 1);
        Race onlyB = race(season, 8, 1);
        result(duplicate, first, null, 1, 0);
        result(a, first, winner, 1, 0);
        result(b, first, second, 0, 0);
        result(a, later, second, 0, 0);
        result(b, later, winner, 1, 0);
        result(a, sameDate, second, 0, 0);
        result(b, sameDate, null, 1, 0);
        result(a, bFinishes, null, 1, 0);
        result(b, bFinishes, second, 0, 0);
        result(duplicate, bothDnf, null, 1, 0);
        result(a, bothDnf, null, 0, 0);
        result(b, bothDnf, null, 0, 0);
        result(a, tied, second, 0, 0);
        result(b, tied, second, 0, 0);
        result(a, unfinished, winner, 1, 0);
        result(b, unfinished, second, 0, 0);
        result(a, onlyA, winner, 1, 0);
        result(b, onlyB, winner, 1, 0);
        persist(new Sprint(null, first, a, sprintWinner));
        persist(new Sprint(null, bFinishes, a, sprintWinner));
        persist(new Sprint(null, later, b, sprintWinner));
        persist(new Sprint(null, unfinished, a, sprintWinner));
        persist(new Sprint(null, onlyA, a, sprintWinner));
        Season otherSeason = season(4);
        Team otherTeam = team("Team", otherSeason);
        Race otherRace = race(otherSeason, 1, 1);
        result(driver("Ana", otherTeam), otherRace, winner, 0, 0);
        result(driver("Bea", otherTeam), otherRace, second, 0, 0);
        flushAndClear();

        StatisticsHeadToHeadDTO dto = service.getHeadToHead(3, "Ana", "Bea");
        assertThat(dto.getSeason()).isEqualTo(3);
        assertThat(dto.getA()).isEqualTo("Ana");
        assertThat(dto.getB()).isEqualTo("Bea");
        assertThat(dto.getAheadA()).isEqualTo(2);
        assertThat(dto.getAheadB()).isEqualTo(2);
        assertThat(dto.getComparable()).isEqualTo(4);
        assertThat(dto.getBothDnf()).isEqualTo(1);
        assertThat(dto.getPointsA()).isEqualTo(96);
        assertThat(dto.getPointsB()).isEqualTo(88);
        assertThat(dto.getRaces()).extracting(row -> row.getRace().getId())
                .containsExactly(first.getId(), later.getId(), sameDate.getId(), bFinishes.getId(),
                        bothDnf.getId(), tied.getId());
        assertThat(dto.getRaces()).extracting(StatisticsHeadToHeadRaceDTO::getResult)
                .containsExactly("A", "B", "A", "B", "NONE", "NONE");
        assertThat(dto.getRaces()).extracting(StatisticsHeadToHeadRaceDTO::getPositionA)
                .containsExactly(1, 2, 2, null, null, 2);
        assertThat(dto.getRaces()).extracting(StatisticsHeadToHeadRaceDTO::getPositionB)
                .containsExactly(2, 1, null, 2, null, 2);
        assertThat(dto.getRaces()).allSatisfy(row -> assertThat(row.getRace().getSeason()).isEqualTo(3));
        StatisticsHeadToHeadDTO reverse = service.getHeadToHead(3, "Bea", "Ana");
        assertThat(reverse.getPointsA()).isEqualTo(dto.getPointsB());
        assertThat(reverse.getPointsB()).isEqualTo(dto.getPointsA());
        assertThat(reverse.getRaces()).extracting(StatisticsHeadToHeadRaceDTO::getResult)
                .containsExactly("B", "A", "B", "A", "NONE", "NONE");
    }

    @Test
    void headToHeadMatchesDriverNamesWithTrailingSpacesAndPreservesRequestedNames() {
        Season season = season(5);
        Team team = team("Team", season);
        Driver a = driver("Chamann ", team);
        Driver b = driver("Bea", team);
        Position winner = position(1, 25);
        Position second = position(2, 18);
        Race first = race(season, 1, 1);
        Race secondRace = race(season, 2, 1);
        result(a, first, winner, 0, 0);
        result(b, first, second, 0, 0);
        result(a, secondRace, second, 0, 0);
        result(b, secondRace, winner, 0, 0);
        flushAndClear();

        StatisticsHeadToHeadDTO withoutSpace = service.getHeadToHead(5, "Chamann", "Bea");
        assertThat(withoutSpace.getA()).isEqualTo("Chamann");
        assertThat(withoutSpace.getB()).isEqualTo("Bea");
        assertThat(withoutSpace.getRaces()).extracting(row -> row.getRace().getId())
                .containsExactly(first.getId(), secondRace.getId());
        assertThat(withoutSpace.getAheadA()).isEqualTo(1);
        assertThat(withoutSpace.getAheadB()).isEqualTo(1);

        StatisticsHeadToHeadDTO withSpace = service.getHeadToHead(5, "Chamann ", "Bea");
        assertThat(withSpace.getA()).isEqualTo("Chamann ");
        assertThat(withSpace.getB()).isEqualTo("Bea");
        assertThat(withSpace.getRaces()).extracting(row -> row.getRace().getId())
                .containsExactly(first.getId(), secondRace.getId());
        assertThat(withSpace.getAheadA()).isEqualTo(1);
        assertThat(withSpace.getAheadB()).isEqualTo(1);
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 0, 1, 2, 3, 99})
    void headToHeadReturnsZeroesWithoutCommonFinishedRaces(int scope) {
        seedTeams(1);
        Season separate = season(2);
        Team team = team("Separate", separate);
        Driver a = driver("Ana 0", team);
        Driver b = driver("Bea 0", team);
        Position winner = position(1, 25);
        result(a, race(separate, 1, 1), winner, 1, 0);
        result(b, race(separate, 2, 1), winner, 1, 0);
        Race unfinished = race(separate, 3, 0);
        result(a, unfinished, winner, 1, 0);
        result(b, unfinished, winner, 1, 0);
        Season pending = season(3);
        Team pendingTeam = team("Pending", pending);
        Race pendingRace = race(pending, 1, 0);
        result(driver("Ana 0", pendingTeam), pendingRace, winner, 0, 0);
        result(driver("Bea 0", pendingTeam), pendingRace, winner, 0, 0);
        flushAndClear();

        String bName = scope == 1 ? "Unknown" : "Bea 0";
        assertThat(service.getHeadToHead(scope, "Ana 0", bName))
                .isEqualTo(new StatisticsHeadToHeadDTO(scope, "Ana 0", bName, 0, 0, 0, 0, 0, 0, List.of()));
        assertThat(service.getHeadToHead(scope, "Unknown A", "Unknown B").getRaces()).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 10})
    void headToHeadUsesTwoBatchQueriesRegardlessOfSeasonSize(int count) {
        seedTeams(count);
        flushAndClear();
        var statistics = em.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();
        statistics.clear();

        StatisticsHeadToHeadDTO dto = service.getHeadToHead(1, " ana 0 ", "BEA 0");
        em.clear();
        json.writeValueAsString(dto);

        assertThat(dto.getAheadA()).isEqualTo(1);
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(2);
        System.out.println("statistics/headToHead: " + count + " teams, "
                + statistics.getPrepareStatementCount() + " SELECTs");
    }

    @Test
    void recordsMergePeopleWithinEachSeasonAndExposeAllRecordSections() {
        Season old = season(1);
        Team big = team("Big", old);
        Driver robe = driver("Robe", big);
        Driver transfer = driver("Robe", team("Small", old));
        Driver ana = driver("Ana", big);
        Driver bea = driver("Bea", team("Other", old));
        Driver dubious = driver("Dubious", big);
        Driver vacant = driver("VaCaNtE12", big);
        Driver vacantWithoutNumber = driver("vacante", big);
        Position first = position(1, 25);
        Position second = position(2, 18);
        Race r2 = race(old, 2, 1);
        Race r1 = race(old, 1, 1);
        Race r3 = race(old, 3, 1);
        Race r4 = race(old, 4, 1);
        for (Race race : List.of(r1, r2, r3, r4))
            race.setDateStart(race.getDateStart().minusYears(1));
        result(transfer, r1, null, 1, 1);
        result(robe, r1, first, 1, 1);
        result(robe, r2, second, 0, 1);
        result(robe, r3, null, 0, 0);
        result(ana, r1, second, 0, 0);
        result(ana, r2, first, 0, 1);
        result(ana, r3, first, 0, 1);
        result(ana, r4, null, 0, 0);
        result(bea, r4, first, 0, 0);
        result(vacant, r1, first, 1, 1);
        result(vacantWithoutNumber, r3, null, 0, 0);
        SprintPosition sprintFirst = persist(new SprintPosition(null, 1, 8));
        persist(new Sprint(null, r1, transfer, sprintFirst));
        persist(new Sprint(null, r1, vacant, sprintFirst));
        PenaltySeverity severity = persist(new PenaltySeverity(null, "Leve"));
        persist(new Penalty(null, r1, robe, "Penalty", severity, old));
        for (Race race : List.of(r3, r4)) {
            for (int index = 0; index < 3; index++)
                persist(new Penalty(null, race, dubious, "Penalty", severity, old));
        }
        persist(new Penalty(null, r1, vacant, "Penalty", severity, old));

        Season current = season(2);
        Team next = team("New", current);
        Driver newRobe = driver("Robe", next);
        Driver newAna = driver("Ana", next);
        Race last = race(current, 3, 1);
        Race pending = race(current, 2, 0);
        Race opening = race(current, 1, 1);
        for (Race race : List.of(opening, last)) {
            result(newRobe, race, first, 1, 1);
            result(newAna, race, second, 0, 0);
        }
        // A pending result and sprint must not affect records or accumulated wins.
        result(newAna, pending, first, 1, 1);
        persist(new Sprint(null, pending, newAna, sprintFirst));
        flushAndClear();

        StatisticsRecordsDTO dto = service.getRecords();
        assertThat(dto.getDriverRecords()).extracting(RecordBoardDTO::getKey).containsExactly(
                "poles", "podiums", "fastLaps", "victories", "winRate", "penalties", "racesFinished", "points");
        assertThat(board(dto.getDriverRecords(), "poles").getHolders())
                .extracting(entry -> entry.getDriver().getName() + entry.getSeason())
                .containsExactly("Ana1", "Robe1", "Robe2");
        RecordEntryDTO oldRobe = board(dto.getDriverRecords(), "points").getRanking().stream()
                .filter(entry -> entry.getSeason() == 1 && entry.getDriver().getName().equals("Robe"))
                .findFirst().orElseThrow();
        assertThat(oldRobe.getValue()).isEqualTo(52);
        assertThat(oldRobe.getDriver().getTeam().getName()).isEqualTo("Big");
        assertThat(oldRobe.getDriver().getSeason().getNumber()).isEqualTo(1);
        assertThat(oldRobe.getDriver().getDriverImage()).isEqualTo("");
        assertThat(board(dto.getDriverRecords(), "victories").getValue()).isEqualTo(2);
        assertThat(board(dto.getDriverRecords(), "racesFinished").getValue()).isEqualTo(3);
        RecordBoardDTO rate = board(dto.getDriverRecords(), "winRate");
        assertThat(rate.isPercent()).isTrue();
        assertThat(rate.getValue()).isEqualTo(100d);
        assertThat(rate.getHolders()).singleElement().satisfies(entry -> {
            assertThat(entry.getDriver().getName()).isEqualTo("Robe");
            assertThat(entry.getSeason()).isEqualTo(2);
        });
        assertThat(rate.getRanking()).noneMatch(entry -> entry.getDriver().getName().equals("Bea"));
        assertThat(rate.getRanking()).filteredOn(entry -> entry.getSeason() == 1
                && entry.getDriver().getName().equals("Robe")).singleElement()
                .extracting(RecordEntryDTO::getValue).isEqualTo(33.3d);
        assertThat(board(dto.getDriverRecords(), "penalties").isNegative()).isTrue();
        assertThat(board(dto.getDriverRecords(), "penalties").getValue()).isEqualTo(6);
        assertThat(dto.getDriverRecords()).allSatisfy(record -> assertThat(record.getRanking())
                .noneMatch(entry -> entry.getDriver().getName().toLowerCase().startsWith("vacante")));

        assertThat(dto.getTeamRecords()).extracting(RecordBoardDTO::getKey)
                .containsExactly("teamPoints", "teamVictories", "teamDoublePodiums");
        assertThat(board(dto.getTeamRecords(), "teamPoints").getValue()).isEqualTo(120);
        assertThat(board(dto.getTeamRecords(), "teamVictories").getValue()).isEqualTo(3);
        assertThat(board(dto.getTeamRecords(), "teamDoublePodiums").getValue()).isEqualTo(2);
        assertThat(board(dto.getTeamRecords(), "teamDoublePodiums").getHolders())
                .extracting(entry -> entry.getTeam().getName()).containsExactly("Big", "New");
        assertThat(dto.getTeamRecords()).allSatisfy(record -> assertThat(record.getRanking()).allSatisfy(entry -> {
            assertThat(entry.getDriver()).isNull();
            assertThat(entry.getTeam().getSeason().getNumber()).isEqualTo(entry.getSeason());
        }));

        assertThat(dto.getHolderCounts()).extracting(count -> count.getDriver().getName())
                .containsExactly("Ana", "Robe", "Dubious");
        assertThat(dto.getHolderCounts()).extracting(RecordHolderCountDTO::getCount).containsExactly(5, 4, 1);
        assertThat(dto.getHolderCounts().get(1).getDriver().getId()).isEqualTo(newRobe.getId());
        assertThat(dto.getSeasons()).extracting(RecordSeasonDTO::getNumber).containsExactly(1, 2);
        assertThat(dto.getSeasons()).extracting(RecordSeasonDTO::isInProgress).containsExactly(false, true);
        assertThat(dto.getSeasons().getFirst()).satisfies(season -> {
            assertThat(season.getYear()).isEqualTo(2024);
            assertThat(season.getRaces()).isEqualTo(4);
            assertThat(season.getFinishedRaces()).isEqualTo(4);
            assertThat(season.getLeader().getDriver().getName()).isEqualTo("Ana");
            assertThat(season.getLeader().getDriver().getSeason().getNumber()).isEqualTo(1);
            assertThat(season.getLeader().getPoints()).isEqualTo(68);
            assertThat(season.getLeader().getMargin()).isEqualTo(16);
        });
        assertThat(dto.getSeasons().getLast().getLeader().getPoints()).isEqualTo(52);
        assertThat(dto.getSeasons().getLast().getLeader().getMargin()).isEqualTo(16);
        assertThat(dto.getSeasons().getLast().getRaces()).isEqualTo(3);
        assertThat(dto.getSeasons().getLast().getFinishedRaces()).isEqualTo(2);
        assertThat(dto.getVictoryProgress().getRaces()).extracting(race -> race.getRace().getId())
                .containsExactly(r1.getId(), r2.getId(), r3.getId(), r4.getId(), opening.getId(), pending.getId(), last.getId());
        assertThat(dto.getVictoryProgress().getRaces()).extracting(VictoryRaceDTO::isPlayed)
                .containsExactly(true, true, true, true, true, false, true);
        assertThat(dto.getVictoryProgress().getRaces()).extracting(VictoryRaceDTO::getOrder)
                .containsExactly(1, 2, 3, 4, 1, 2, 3);
        assertThat(dto.getVictoryProgress().getSeries().getFirst()).satisfies(series -> {
            assertThat(series.getDriver().getId()).isEqualTo(newRobe.getId());
            assertThat(series.getWins()).containsExactly(1, 1, 1, 1, 2, null, 3);
        });
    }

    @Test
    void recordsUseCompetitionRanksAndIncludeEveryTieAtTheFifthValue() {
        Season season = season(1);
        Team team = team("Team", season);
        List<Race> calendar = java.util.stream.IntStream.rangeClosed(1, 5)
                .mapToObj(day -> race(season, day, 1)).toList();
        int[] poles = {5, 5, 4, 3, 2, 2, 1};
        for (int index = poles.length - 1; index >= 0; index--) {
            Driver driver = driver("Driver " + index, team);
            for (int day = 0; day < poles[index]; day++)
                result(driver, calendar.get(day), null, 0, 1);
        }
        flushAndClear();
        StatisticsRecordsDTO dto = service.getRecords();
        RecordBoardDTO board = board(dto.getDriverRecords(), "poles");
        assertThat(board.getHolders()).hasSize(2);
        assertThat(board.getRanking()).extracting(RecordEntryDTO::getRank).containsExactly(1, 1, 3, 4, 5, 5);
        assertThat(board.getRanking()).extracting(entry -> entry.getDriver().getName())
                .containsExactly("Driver 0", "Driver 1", "Driver 2", "Driver 3", "Driver 4", "Driver 5");
        assertThat(board.getRanking()).containsAll(board.getHolders());
        assertThat(dto.getDriverRecords()).extracting(RecordBoardDTO::getKey).containsExactly("poles");
    }

    @ParameterizedTest
    @ValueSource(ints = {4, 5})
    void winRateRequiresAtLeastHalfTheFinishedCalendarIncludingRetirements(int finishedCount) {
        Season season = season(1);
        Team team = team("Team", season);
        Driver eligible = driver("Eligible", team);
        Driver shortSample = driver("Short", team);
        Position winner = position(1, 25);
        int half = (finishedCount + 1) / 2;
        for (int index = 0; index < finishedCount; index++) {
            Race race = race(season, index + 1, 1);
            if (index < half)
                result(eligible, race, index == 0 ? winner : null, 0, 0);
            if (index < half - 1)
                result(shortSample, race, winner, 0, 0);
        }
        race(season, finishedCount + 1, 0);
        flushAndClear();
        RecordBoardDTO rate = board(service.getRecords().getDriverRecords(), "winRate");
        assertThat(rate.getValue()).isEqualTo(finishedCount == 4 ? 50d : 33.3d);
        assertThat(rate.getRanking()).singleElement()
                .extracting(entry -> entry.getDriver().getName()).isEqualTo("Eligible");
    }

    @Test
    void recordsKeepAllHoldersEvenWhenMoreThanFiveShareFirstPlace() {
        seedTeams(7);
        flushAndClear();
        StatisticsRecordsDTO records = service.getRecords();
        RecordBoardDTO victories = board(records.getDriverRecords(), "victories");
        assertThat(victories.getHolders()).hasSize(7);
        assertThat(records.getHolderCounts()).extracting(count -> count.getDriver().getName())
                .containsExactly("Ana 0", "Ana 1", "Ana 2", "Ana 3", "Ana 4", "Ana 5", "Ana 6");
        assertThat(records.getHolderCounts()).extracting(RecordHolderCountDTO::getCount)
                .containsExactly(7, 7, 7, 7, 7, 7, 7);
        assertThat(victories.getRanking()).hasSize(7).allSatisfy(entry -> assertThat(entry.getRank()).isEqualTo(1));
    }

    @Test
    void victoryProgressSelectsFivePeopleByWinsThenPointsThenNameAndUsesDateAndIdOrder() {
        Season season = season(1);
        Team team = team("Team", season);
        Race first = race(season, 1, 1);
        Race second = persist(new Race(null, "Second race", "", "", first.getDateStart(), season, 1));
        Race pending = race(season, 2, 0);
        Position winner = position(1, 25);
        String[] names = {"Zed", "Bea", "Ana", "Cid", "Eli", "Dan", "Fox"};
        int[] extra = {25, 20, 20, 18, 0, 0, 100};
        for (int index = 0; index < names.length; index++) {
            Driver driver = driver(names[index], team);
            if (index < 6)
                result(driver, first, winner, 0, 0);
            result(driver, second, position(index == 0 ? 1 : 2, extra[index]), 0, 0);
        }
        flushAndClear();
        VictoryProgressDTO progress = service.getRecords().getVictoryProgress();
        assertThat(progress.getSeries()).extracting(series -> series.getDriver().getName())
                .containsExactly("Zed", "Ana", "Bea", "Cid", "Dan");
        assertThat(progress.getRaces()).extracting(race -> race.getRace().getId())
                .containsExactly(first.getId(), second.getId(), pending.getId());
        assertThat(progress.getSeries().getFirst().getWins()).containsExactly(1, 2, null);
        assertThat(progress.getSeries().subList(1, 5)).allSatisfy(series ->
                assertThat(series.getWins()).containsExactly(1, 1, null));
    }

    @Test
    void recordsHandleEmptyDatabaseAndPendingSeasonsAndSingleDriverLeader() {
        StatisticsRecordsDTO empty = service.getRecords();
        assertThat(empty.getSeasons()).isEmpty();
        assertThat(empty.getDriverRecords()).isEmpty();
        assertThat(empty.getTeamRecords()).isEmpty();
        assertThat(empty.getHolderCounts()).isEmpty();
        assertThat(empty.getVictoryProgress().getRaces()).isEmpty();
        assertThat(empty.getVictoryProgress().getSeries()).isEmpty();

        Season old = season(1);
        Driver solo = driver("Solo", team("Team", old));
        Race played = race(old, 1, 1);
        race(old, 2, 0);
        result(solo, played, position(1, 25), 0, 0);
        Season latest = season(2);
        driver("Waiting", team("Next", latest));
        race(latest, 3, 0);
        season(3); // Seasons with no calendar do not appear.
        flushAndClear();
        StatisticsRecordsDTO dto = service.getRecords();
        assertThat(dto.getSeasons()).hasSize(2);
        assertThat(dto.getSeasons().getFirst().getLeader().getMargin()).isZero();
        assertThat(dto.getSeasons().getLast().getLeader()).isNull();
        assertThat(dto.getSeasons().getLast().isInProgress()).isTrue();
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 10})
    void recordsUseFiveBatchQueriesIncludingDetachedSerialization(int count) {
        seedTeams(count);
        flushAndClear();
        var statistics = em.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        StatisticsRecordsDTO dto = service.getRecords();
        em.clear();
        json.writeValueAsString(dto);
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(5);
        System.out.println("statistics/records: " + count + " teams, "
                + statistics.getPrepareStatementCount() + " SELECTs");
    }

    private RecordBoardDTO board(List<RecordBoardDTO> boards, String key) {
        return boards.stream().filter(board -> board.getKey().equals(key)).findFirst().orElseThrow();
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
