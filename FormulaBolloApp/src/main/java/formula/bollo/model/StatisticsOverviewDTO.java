package formula.bollo.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StatisticsOverviewDTO {
    private int season;
    private StatisticsSummaryDTO summary;
    private List<DriverStatsDTO> drivers;
    private List<TeamStatsDTO> teams;
    private StatisticsEvolutionDTO<DriverStatisticsSeriesDTO> driverEvolution;
    private StatisticsEvolutionDTO<TeamStatisticsSeriesDTO> teamEvolution;
}
