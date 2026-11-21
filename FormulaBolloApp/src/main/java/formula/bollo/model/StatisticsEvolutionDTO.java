package formula.bollo.model;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StatisticsEvolutionDTO<T> {
    private List<StatisticsRaceDTO> races;
    private List<T> series;
}
