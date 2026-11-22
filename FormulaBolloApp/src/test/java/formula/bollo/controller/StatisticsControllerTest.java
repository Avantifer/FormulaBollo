package formula.bollo.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import formula.bollo.model.*;
import formula.bollo.service.StatisticsService;

class StatisticsControllerTest {
    final StatisticsService service = mock(StatisticsService.class);
    final StatisticsController controller = new StatisticsController(service);

    @Test
    void overviewSerializesContractFieldNamesAndPublicDtos() throws Exception {
        DriverDTO driver = new DriverDTO(1L, "Ana", 7, "", new SeasonDTO(1L, "Season", 1, "2026"), null);
        TeamDTO team = new TeamDTO(1L, "Team", "", "", driver.getSeason());
        DriverStatsDTO driverStats = new DriverStatsDTO();
        driverStats.setDriver(driver);
        driverStats.setPenaltiesBy(new StatisticsPenaltiesDTO(1, 2, 3));
        driverStats.setPositionDistribution(new int[21]);
        driverStats.setPointsBySeason(Map.of(1, 25));
        TeamStatsDTO teamStats = new TeamStatsDTO();
        teamStats.setTeam(team);
        teamStats.setDrivers(List.of(new TeamDriverStatsDTO("Ana", 25)));
        teamStats.setDuels(List.of(new TeamDuelDTO(1, "Ana", "Bea", 2, 3, 4)));
        teamStats.setPointsBySeason(Map.of(1, 25));
        var axis = List.of(new StatisticsRaceDTO(1L, "Race", 1));
        when(service.getOverview(0)).thenReturn(new StatisticsOverviewDTO(0,
                new StatisticsSummaryDTO(2, 1, 1, 50d, 0.125, 5),
                List.of(driverStats), List.of(teamStats),
                new StatisticsEvolutionDTO<>(axis, List.of(new DriverStatisticsSeriesDTO(driver, List.of(25)))),
                new StatisticsEvolutionDTO<>(axis, List.of(new TeamStatisticsSeriesDTO(team, List.of(25))))));
        var mvc = MockMvcBuilders.standaloneSetup(controller).build();

        var response = mvc.perform(get("/statistics/overview").param("season", "0"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.length()").value(6))
                .andExpect(jsonPath("$.season").value(0))
                .andExpect(jsonPath("$.summary.raceCount").value(2))
                .andExpect(jsonPath("$.summary.finishedRaces").value(1))
                .andExpect(jsonPath("$.summary.distinctWinners").value(1))
                .andExpect(jsonPath("$.summary.poleWinRate").value(50))
                .andExpect(jsonPath("$.summary.dnfRate").value(0.125))
                .andExpect(jsonPath("$.summary.margin").value(5))
                .andExpect(jsonPath("$.drivers[0].driver.name").value("Ana"))
                .andExpect(jsonPath("$.drivers[0].positionDistribution.length()").value(21))
                .andExpect(jsonPath("$.drivers[0].penaltiesBy.warning").value(1))
                .andExpect(jsonPath("$.drivers[0].penaltiesBy.minor").value(2))
                .andExpect(jsonPath("$.drivers[0].penaltiesBy.serious").value(3))
                .andExpect(jsonPath("$.drivers[0].pointsBySeason.1").value(25))
                .andExpect(jsonPath("$.teams[0].team.name").value("Team"))
                .andExpect(jsonPath("$.teams[0].drivers[0].name").value("Ana"))
                .andExpect(jsonPath("$.teams[0].drivers[0].points").value(25))
                .andExpect(jsonPath("$.teams[0].pointsBySeason.1").value(25))
                .andExpect(jsonPath("$.teams[0].duels[0].length()").value(6))
                .andExpect(jsonPath("$.teams[0].duels[0].season").value(1))
                .andExpect(jsonPath("$.teams[0].duels[0].a").value("Ana"))
                .andExpect(jsonPath("$.teams[0].duels[0].b").value("Bea"))
                .andExpect(jsonPath("$.teams[0].duels[0].aAhead").value(2))
                .andExpect(jsonPath("$.teams[0].duels[0].bAhead").value(3))
                .andExpect(jsonPath("$.teams[0].duels[0].tied").value(4));
        for (String field : List.of("poles", "fastlaps", "racesFinished", "totalPoints", "penalties",
                "victories", "podiums", "averagePosition", "races", "dnfs")) {
            response.andExpect(jsonPath("$.drivers[0]." + field).value(0));
            response.andExpect(jsonPath("$.teams[0]." + field).value(0));
        }
        for (String field : List.of("poleWins", "hatTricks", "winStreak", "podiumStreak", "currentPodiumStreak"))
            response.andExpect(jsonPath("$.drivers[0]." + field).value(0));
        response.andExpect(jsonPath("$.drivers[0].posStd").isEmpty());
        for (String field : List.of("pointsShare", "doublePoints", "doublePodiums"))
            response.andExpect(jsonPath("$.teams[0]." + field).value(0));
        for (String field : List.of("driverEvolution", "teamEvolution")) {
            response.andExpect(jsonPath("$." + field + ".races[0].id").value(1))
                    .andExpect(jsonPath("$." + field + ".races[0].name").value("Race"))
                    .andExpect(jsonPath("$." + field + ".races[0].season").value(1))
                    .andExpect(jsonPath("$." + field + ".series[0].cumulative[0]").value(25));
        }
        response.andExpect(jsonPath("$.driverEvolution.series[0].driver.name").value("Ana"))
                .andExpect(jsonPath("$.teamEvolution.series[0].team.name").value("Team"));
        verify(service).getOverview(0);
    }

    @Test
    void headToHeadSerializesContractIncludingNullPositions() throws Exception {
        when(service.getHeadToHead(3, "Ana", "Bea")).thenReturn(new StatisticsHeadToHeadDTO(
                3, "Ana", "Bea", 2, 1, 3, 1, 51, 33, List.of(
                        new StatisticsHeadToHeadRaceDTO(new StatisticsRaceDTO(7L, "Race", 3), 1, null, "A"),
                        new StatisticsHeadToHeadRaceDTO(new StatisticsRaceDTO(8L, "Next", 3), null, null, "NONE"))));
        var mvc = MockMvcBuilders.standaloneSetup(controller).build();
        mvc.perform(get("/statistics/headToHead").param("season", "3").param("a", "Ana").param("b", "Bea"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.length()").value(10))
                .andExpect(jsonPath("$.season").value(3))
                .andExpect(jsonPath("$.a").value("Ana"))
                .andExpect(jsonPath("$.b").value("Bea"))
                .andExpect(jsonPath("$.aheadA").value(2))
                .andExpect(jsonPath("$.aheadB").value(1))
                .andExpect(jsonPath("$.comparable").value(3))
                .andExpect(jsonPath("$.bothDnf").value(1))
                .andExpect(jsonPath("$.pointsA").value(51))
                .andExpect(jsonPath("$.pointsB").value(33))
                .andExpect(jsonPath("$.races.length()").value(2))
                .andExpect(jsonPath("$.races[0].length()").value(4))
                .andExpect(jsonPath("$.races[0].race.length()").value(3))
                .andExpect(jsonPath("$.races[0].race.id").value(7))
                .andExpect(jsonPath("$.races[0].race.name").value("Race"))
                .andExpect(jsonPath("$.races[0].race.season").value(3))
                .andExpect(jsonPath("$.races[0].positionA").value(1))
                .andExpect(jsonPath("$.races[0].positionB").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.races[0].result").value("A"))
                .andExpect(jsonPath("$.races[1].positionA").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.races[1].result").value("NONE"));
        verify(service).getHeadToHead(3, "Ana", "Bea");
    }

    @Test
    void headToHeadRejectsEqualAndBlankNamesThroughRealServiceValidation() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new StatisticsController(
                mock(StatisticsService.class, CALLS_REAL_METHODS))).build();
        for (String[] names : List.of(new String[]{"Ana", "Ana"}, new String[]{" Ana ", "aNA"},
                new String[]{" ", "Bea"}, new String[]{"Ana", "\t"})) {
            mvc.perform(get("/statistics/headToHead").param("season", "3")
                    .param("a", names[0]).param("b", names[1])).andExpect(status().isBadRequest());
        }
    }

    @Test
    void recordsSerializeEveryContractFieldWithoutParameters() throws Exception {
        SeasonDTO season = new SeasonDTO(1L, "Season", 3, "2026");
        TeamDTO team = new TeamDTO(2L, "Team", "logo", "red", season);
        DriverDTO driver = new DriverDTO(4L, "Robe", 7, "image", season, team);
        StatisticsRaceDTO race = new StatisticsRaceDTO(8L, "Race", 3);
        RecordEntryDTO driverEntry = new RecordEntryDTO(1, 37.5d, 3, driver, null);
        RecordEntryDTO teamEntry = new RecordEntryDTO(1, 100, 3, null, team);
        when(service.getRecords()).thenReturn(new StatisticsRecordsDTO(
                List.of(new RecordSeasonDTO(3, 2026, 8, 4, true, new RecordLeaderDTO(driver, 100, 20))),
                List.of(new RecordBoardDTO("winRate", "% de victorias", true, false, 37.5d,
                        List.of(driverEntry), List.of(driverEntry))),
                List.of(new RecordBoardDTO("teamPoints", "Puntos de equipo", false, false, 100,
                        List.of(teamEntry), List.of(teamEntry))),
                List.of(new RecordHolderCountDTO(driver, 2)),
                new VictoryProgressDTO(List.of(new VictoryRaceDTO(race, 3, 4, true)),
                        List.of(new VictorySeriesDTO(driver, new Integer[]{2, null})))));
        var mvc = MockMvcBuilders.standaloneSetup(controller).build();
        var response = mvc.perform(get("/statistics/records"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$.seasons[0].length()").value(6))
                .andExpect(jsonPath("$.seasons[0].number").value(3))
                .andExpect(jsonPath("$.seasons[0].year").value(2026))
                .andExpect(jsonPath("$.seasons[0].races").value(8))
                .andExpect(jsonPath("$.seasons[0].finishedRaces").value(4))
                .andExpect(jsonPath("$.seasons[0].inProgress").value(true))
                .andExpect(jsonPath("$.seasons[0].leader.driver.name").value("Robe"))
                .andExpect(jsonPath("$.seasons[0].leader.points").value(100))
                .andExpect(jsonPath("$.seasons[0].leader.margin").value(20))
                .andExpect(jsonPath("$.driverRecords[0].key").value("winRate"))
                .andExpect(jsonPath("$.driverRecords[0].title").value("% de victorias"))
                .andExpect(jsonPath("$.driverRecords[0].percent").value(true))
                .andExpect(jsonPath("$.driverRecords[0].negative").value(false))
                .andExpect(jsonPath("$.driverRecords[0].value").value(37.5))
                .andExpect(jsonPath("$.driverRecords[0].holders[0].driver.team.name").value("Team"))
                .andExpect(jsonPath("$.driverRecords[0].holders[0].driver.season.number").value(3))
                .andExpect(jsonPath("$.driverRecords[0].holders[0].driver.driverImage").value("image"))
                .andExpect(jsonPath("$.teamRecords[0].holders[0].team.name").value("Team"))
                .andExpect(jsonPath("$.teamRecords[0].holders[0].driver").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.holderCounts[0].length()").value(2))
                .andExpect(jsonPath("$.holderCounts[0].driver.name").value("Robe"))
                .andExpect(jsonPath("$.holderCounts[0].count").value(2))
                .andExpect(jsonPath("$.victoryProgress.races[0].length()").value(4))
                .andExpect(jsonPath("$.victoryProgress.races[0].race.id").value(8))
                .andExpect(jsonPath("$.victoryProgress.races[0].season").value(3))
                .andExpect(jsonPath("$.victoryProgress.races[0].order").value(4))
                .andExpect(jsonPath("$.victoryProgress.races[0].played").value(true))
                .andExpect(jsonPath("$.victoryProgress.series[0].driver.name").value("Robe"))
                .andExpect(jsonPath("$.victoryProgress.series[0].wins[0]").value(2))
                .andExpect(jsonPath("$.victoryProgress.series[0].wins[1]").value(org.hamcrest.Matchers.nullValue()));
        for (String field : List.of("driverRecords", "teamRecords")) {
            response.andExpect(jsonPath("$." + field + "[0].length()").value(7));
            for (String entries : List.of("holders", "ranking")) {
                response.andExpect(jsonPath("$." + field + "[0]." + entries + "[0].length()").value(5))
                        .andExpect(jsonPath("$." + field + "[0]." + entries + "[0].rank").value(1))
                        .andExpect(jsonPath("$." + field + "[0]." + entries + "[0].season").value(3));
            }
        }
        response.andExpect(jsonPath("$.driverRecords[0].ranking[0].value").value(37.5))
                .andExpect(jsonPath("$.teamRecords[0].ranking[0].value").value(100));
        verify(service).getRecords();
    }

    @Test
    void recordsReturn200AndEmptyListsForEmptyDatabase() throws Exception {
        var realService = new StatisticsService(mock(formula.bollo.repository.DriverRepository.class),
                mock(formula.bollo.repository.TeamRepository.class), mock(formula.bollo.repository.RaceRepository.class),
                mock(formula.bollo.repository.ResultRepository.class), mock(formula.bollo.repository.SprintRepository.class),
                mock(formula.bollo.repository.PenaltyRepository.class), mock(formula.bollo.service.DriverService.class),
                mock(formula.bollo.service.TeamService.class));
        var mvc = MockMvcBuilders.standaloneSetup(new StatisticsController(realService)).build();
        var response = mvc.perform(get("/statistics/records")).andExpect(status().isOk());
        for (String field : List.of("seasons", "driverRecords", "teamRecords", "holderCounts"))
            response.andExpect(jsonPath("$." + field).isEmpty());
        response.andExpect(jsonPath("$.victoryProgress.races").isEmpty())
                .andExpect(jsonPath("$.victoryProgress.series").isEmpty());
    }

    @Test
    void missingAndMalformedSeasonAreBadRequests() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(controller).build();
        mvc.perform(get("/statistics/overview")).andExpect(status().isBadRequest());
        mvc.perform(get("/statistics/overview").param("season", "invalid")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
