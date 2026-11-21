package formula.bollo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StatisticsSummaryDTO {
    private int raceCount;
    private int finishedRaces;
    private int distinctWinners;
    private Double poleWinRate;
    private double dnfRate;
    private int margin;
}
