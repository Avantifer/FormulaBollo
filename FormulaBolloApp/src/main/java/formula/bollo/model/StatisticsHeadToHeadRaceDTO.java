package formula.bollo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StatisticsHeadToHeadRaceDTO {
    private StatisticsRaceDTO race;
    private Integer positionA;
    private Integer positionB;
    private String result;
}
