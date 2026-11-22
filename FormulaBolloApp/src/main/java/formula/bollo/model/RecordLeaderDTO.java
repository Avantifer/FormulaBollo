package formula.bollo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RecordLeaderDTO {
    private DriverDTO driver;
    private int points;
    private int margin;
}
