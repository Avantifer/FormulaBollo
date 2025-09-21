package formula.bollo.model;

import lombok.Data;

@Data
public class FantasyPointsAccountDTO {
    private AccountDTO account;
    private FantasyElectionDTO fantasyElection;
    private int totalPoints;
}
