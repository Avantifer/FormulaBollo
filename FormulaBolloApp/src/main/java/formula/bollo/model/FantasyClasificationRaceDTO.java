package formula.bollo.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FantasyClasificationRaceDTO {
    private Long id;
    private String name;
    private int order;
    private boolean finished;
}
