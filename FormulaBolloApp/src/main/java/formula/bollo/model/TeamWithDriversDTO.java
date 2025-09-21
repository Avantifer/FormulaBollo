package formula.bollo.model;

import formula.bollo.enums.PositionChange;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TeamWithDriversDTO {
    private TeamDTO team;
    private DriverPointsDTO driver1;
    private DriverPointsDTO driver2;
    private Integer totalPoints;
    private PositionChange positionChange;
    private int positionChangeAmount;
}
