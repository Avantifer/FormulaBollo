package formula.bollo.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DriverInfoDTO {
    DriverDTO driver;
    int poles;
    int fastlaps;
    int racesFinished;
    int totalPoints;
    int championships;
    int penalties;
    int bestPosition;
    int victories;
    int podiums;
    double averagePosition;
    List<ResultDTO> last5Results;
}
