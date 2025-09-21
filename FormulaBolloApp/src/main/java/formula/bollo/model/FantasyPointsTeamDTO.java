package formula.bollo.model;

import lombok.Data;

@Data
public class FantasyPointsTeamDTO {
    private Long id;
    private TeamDTO team;
    private RaceDTO race;
    private int points;
}