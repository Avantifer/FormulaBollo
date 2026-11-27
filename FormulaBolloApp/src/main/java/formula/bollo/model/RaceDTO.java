package formula.bollo.model;

import java.time.LocalDateTime;
import formula.bollo.utils.RaceTime;
import tools.jackson.databind.annotation.JsonDeserialize;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RaceDTO {
    private Long id;
    private String name;
    private String flagImage;
    private String circuitImage;
    @JsonDeserialize(using = RaceTime.Deserializer.class)
    private LocalDateTime dateStart;
    private SeasonDTO season;
    private int finished;
}
