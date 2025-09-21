package formula.bollo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FantasyElectionDTO {
    private Long id;
    private AccountDTO account;
    private DriverDTO driverOne;
    private DriverDTO driverTwo;
    private DriverDTO driverThree;
    private TeamDTO teamOne;
    private TeamDTO teamTwo;
    private RaceDTO race;
}
