package formula.bollo.model;

import lombok.Data;

@Data
public class FantasyPointsDriverDTO {
    private Long id;
    private DriverDTO driver;
    private RaceDTO race;
    private int points;
}
