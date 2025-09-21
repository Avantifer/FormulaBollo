package formula.bollo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FantasyInfoDTO {
    private int totalPoints = 0;
    private int averagePoints = 0;
    private double differencePrice = 0;
}
