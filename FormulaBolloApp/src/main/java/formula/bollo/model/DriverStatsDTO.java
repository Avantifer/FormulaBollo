package formula.bollo.model;

import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DriverStatsDTO {
    private DriverDTO driver;
    private int poles;
    private int fastlaps;
    private int racesFinished;
    private int totalPoints;
    private int penalties;
    private int victories;
    private int podiums;
    private double averagePosition;
    private int races;
    private int dnfs;
    private int poleWins;
    private int hatTricks;
    private int winStreak;
    private int podiumStreak;
    private int currentPodiumStreak;
    private Double posStd;
    private StatisticsPenaltiesDTO penaltiesBy;
    private int[] positionDistribution;
    private Map<Integer, Integer> pointsBySeason;

    public DriverStatsDTO(DriverInfoDTO info) {
        this.driver = info.getDriver();
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
