package formula.bollo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FantasyPriceDriverDTO {
    private Long id;
    private DriverDTO driver;
    private RaceDTO race;
    private int price;
    private FantasyInfoDTO fantasyInfo;
}
