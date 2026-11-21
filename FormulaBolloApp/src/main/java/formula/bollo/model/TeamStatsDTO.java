package formula.bollo.model;

import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TeamStatsDTO {
    private TeamDTO team;
    private int poles;
    private int fastlaps;
    private int racesFinished;
    private int totalPoints;
    private int penalties;
    private int victories;
    private int podiums;
    private double averagePosition;
    private double pointsShare;
    private int races;
    private int dnfs;
    private int doublePoints;
    private int doublePodiums;
    private List<TeamDriverStatsDTO> drivers;
    private List<TeamDuelDTO> duels;
    private Map<Integer, Integer> pointsBySeason;

    public TeamStatsDTO(TeamInfoDTO info) {
        this.team = info.getTeam();
        this.poles = info.getPoles();
        this.fastlaps = info.getFastlaps();
        this.racesFinished = info.getRacesFinished();
        this.totalPoints = info.getTotalPoints();
        this.penalties = info.getPenalties();
        this.victories = info.getVictories();
        this.podiums = info.getPodiums();
        this.averagePosition = info.getAveragePosition();
    }
}
