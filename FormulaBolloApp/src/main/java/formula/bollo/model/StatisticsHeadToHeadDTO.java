package formula.bollo.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StatisticsHeadToHeadDTO {
    private int season;
    private String a;
    private String b;
    private int aheadA;
    private int aheadB;
    private int comparable;
    private int bothDnf;
    private int pointsA;
    private int pointsB;
    private List<StatisticsHeadToHeadRaceDTO> races;
}
