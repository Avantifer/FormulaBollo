package formula.bollo.model;

import java.util.List;
import java.math.BigDecimal;
import com.fasterxml.jackson.annotation.JsonInclude;

public record AdminPricesDTO(List<Entry> drivers, List<Entry> teams) {
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record Entry(Long id, String name, Integer storedPrice, Integer suggestedPrice) { }
    public record Price(Long id, BigDecimal price) { }
    public record Update(List<Price> drivers, List<Price> teams) { }
}
