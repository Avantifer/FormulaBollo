package formula.bollo.model;

import formula.bollo.entity.Driver;
import formula.bollo.entity.Season;
import formula.bollo.entity.Team;
import lombok.Data;

@Data
public class RecordDTO {
    private String title;
    private Number value;
    private Driver driver;
    private Team team;
    private Season season;

    public RecordDTO(String title, Number value, Driver driver, Team team, Season season) {
        this.title = title;
        this.value = value;
        this.driver = driver;
        this.team = team;
        this.season = season;
    }
}
