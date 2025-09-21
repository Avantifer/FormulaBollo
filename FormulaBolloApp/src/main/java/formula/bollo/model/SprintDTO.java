package formula.bollo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SprintDTO {
    private Long id;
    private RaceDTO race;
    private DriverDTO driver;
    private SprintPositionDTO position;
}