package formula.bollo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PenaltyDTO {
    private Long id;
    private RaceDTO race;
    private DriverDTO driver;
    private String reason;
    private PenaltySeverityDTO penaltySeverity;
    private SeasonDTO season;
}
