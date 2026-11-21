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
    void missingAndMalformedSeasonAreBadRequests() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(controller).build();
        mvc.perform(get("/statistics/overview")).andExpect(status().isBadRequest());
        mvc.perform(get("/statistics/overview").param("season", "invalid")).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
