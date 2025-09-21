package formula.bollo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResultDTO {
    private Long id;
    private RaceDTO race;
    private DriverDTO driver;
    private PositionDTO position;
    private int fastlap;
    private int pole;
}
