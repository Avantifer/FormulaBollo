package formula.bollo.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class VictoryProgressDTO {
    private List<VictoryRaceDTO> races;
    private List<VictorySeriesDTO> series;
}
