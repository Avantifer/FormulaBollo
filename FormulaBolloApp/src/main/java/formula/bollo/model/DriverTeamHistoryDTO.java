package formula.bollo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DriverTeamHistoryDTO {
    private SeasonDTO season;
    private TeamDTO team;
}
