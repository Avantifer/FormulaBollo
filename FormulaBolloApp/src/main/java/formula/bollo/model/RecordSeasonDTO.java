package formula.bollo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RecordSeasonDTO {
    private int number;
    private int year;
    private int races;
    private int finishedRaces;
    private boolean inProgress;
    private RecordLeaderDTO leader;
}
