package formula.bollo.model;

import java.time.LocalDateTime;

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
    private LocalDateTime dateStart;
    private SeasonDTO season;
    private int finished;
}
