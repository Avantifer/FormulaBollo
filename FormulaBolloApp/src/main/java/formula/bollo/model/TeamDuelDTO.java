package formula.bollo.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TeamDuelDTO {
    private int season;
    private String a;
    private String b;
    @JsonProperty("aAhead")
    @Getter(onMethod_ = @JsonProperty("aAhead"))
    private int aAhead;
    @JsonProperty("bAhead")
    @Getter(onMethod_ = @JsonProperty("bAhead"))
    private int bAhead;
    private int tied;
}
