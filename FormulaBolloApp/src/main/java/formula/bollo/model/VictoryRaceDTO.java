package formula.bollo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class VictoryRaceDTO {
    private StatisticsRaceDTO race;
    private int season;
    private int order;
    private boolean played;
}
