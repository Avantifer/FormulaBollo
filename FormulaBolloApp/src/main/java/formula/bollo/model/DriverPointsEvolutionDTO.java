package formula.bollo.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DriverPointsEvolutionDTO {
    private DriverDTO driver;
    private List<Integer> accumulatedPoints;
    private List<RaceDTO> races;
}
