package formula.bollo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RecordEntryDTO {
    private int rank;
    private Number value;
    private int season;
    private DriverDTO driver;
    private TeamDTO team;
}
