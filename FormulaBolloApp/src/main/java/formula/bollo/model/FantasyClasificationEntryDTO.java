package formula.bollo.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FantasyClasificationEntryDTO {
    private Long raceId;
    private AccountDTO account;
    private int points;
    private List<FantasyClasificationDriverPickDTO> drivers;
    private List<FantasyClasificationTeamPickDTO> teams;
}
