package formula.bollo.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FantasyClasificationDTO {
    private int season;
    private List<FantasyClasificationRaceDTO> races;
    private List<DriverDTO> drivers;
    private List<TeamDTO> teams;
    private List<FantasyClasificationEntryDTO> entries;
}
