package formula.bollo.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TeamInfoDTO {
    private TeamDTO team;
    private int poles;
    private int fastlaps;
    private int racesFinished;
    private int totalPoints;
    private int constructors;
    private int penalties;
    private int bestPosition;
    private int victories;
    private int podiums;
    private double averagePosition;
    private List<ResultTeamDTO> last5Results;

    public TeamInfoDTO(TeamDTO teamDTO, int constructors) {
        this.setTeam(teamDTO);
        this.setConstructors(constructors);
    }

    public TeamInfoDTO(TeamDTO teamDTO, int constructors, DriverInfoDTO driverInfoDTO,
            List<ResultTeamDTO> last5Results) {
        this.setTeam(teamDTO);
        this.setConstructors(constructors);
        this.setPoles(driverInfoDTO.getPoles());
        this.setFastlaps(driverInfoDTO.getFastlaps());
        this.setRacesFinished(driverInfoDTO.getRacesFinished());
        this.setTotalPoints(driverInfoDTO.getTotalPoints());
        this.setPenalties(driverInfoDTO.getPenalties());
        this.setBestPosition(driverInfoDTO.getBestPosition());
        this.setPodiums(driverInfoDTO.getPodiums());
        this.setVictories(driverInfoDTO.getVictories());
        this.setAveragePosition(driverInfoDTO.getAveragePosition());
        this.setLast5Results(last5Results);
    }
}
