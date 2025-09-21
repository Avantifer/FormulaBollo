package formula.bollo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Data
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@NoArgsConstructor
@AllArgsConstructor
public class DriverDTO {
    @EqualsAndHashCode.Include
    private Long id;
    @EqualsAndHashCode.Include
    private String name;
    private int number;
    private String driverImage;
    @EqualsAndHashCode.Include
    private SeasonDTO season;
    @EqualsAndHashCode.Include
    private TeamDTO team;
}
