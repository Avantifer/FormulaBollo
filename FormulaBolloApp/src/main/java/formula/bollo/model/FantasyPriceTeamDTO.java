package formula.bollo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FantasyPriceTeamDTO {
    private Long id;
    private TeamDTO team;
    private RaceDTO race;
    private int price;
    private FantasyInfoDTO fantasyInfo;
}
