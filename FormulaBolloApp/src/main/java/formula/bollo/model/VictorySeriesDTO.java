package formula.bollo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class VictorySeriesDTO {
    private DriverDTO driver;
    private Integer[] wins;
}
