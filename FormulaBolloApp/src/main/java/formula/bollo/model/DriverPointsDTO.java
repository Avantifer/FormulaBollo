package formula.bollo.model;

import formula.bollo.enums.PositionChange;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DriverPointsDTO {
    private DriverDTO driver;
    private int totalPoints;
    private PositionChange positionChange;
    private int positionChangeAmount;

    public DriverPointsDTO(DriverDTO driver, int totalPoints) {
        this.driver = driver;
        this.totalPoints = totalPoints;
    }
}