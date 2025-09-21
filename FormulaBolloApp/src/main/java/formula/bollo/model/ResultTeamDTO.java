package formula.bollo.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ResultTeamDTO {
  private RaceDTO race;
  private List<ResultDTO> results;
  private int totalPoints;
  private int hasFastLap;
  private int hasPole;
}
