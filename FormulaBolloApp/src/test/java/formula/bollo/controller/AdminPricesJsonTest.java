package formula.bollo.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import formula.bollo.model.AdminPricesDTO;
import formula.bollo.service.FantasyService;
import tools.jackson.databind.json.JsonMapper;

class AdminPricesJsonTest {
    @Test
    void httpIncludesStoredAndNullMoneyUnitPrices() throws Exception {
        FantasyService service = mock(FantasyService.class);
        when(service.getAdminPrices(1)).thenReturn(new AdminPricesDTO(List.of(
                new AdminPricesDTO.Entry(1L, "Ana", 6_000_000, 6_000_000),
                new AdminPricesDTO.Entry(2L, "Bea", null, null)), List.of()));
        var mvc = MockMvcBuilders.standaloneSetup(new FantasyController(null, null, null, null, null, null, service)).build();
        String body = mvc.perform(get("/fantasy/adminPrices").param("raceId", "1"))
                .andReturn().getResponse().getContentAsString();
        var drivers = JsonMapper.builder().build().readTree(body).get("drivers");
        assertThat(drivers.get(0).get("storedPrice").intValue()).isEqualTo(6_000_000);
        assertThat(drivers.get(1).get("storedPrice").isNull()).isTrue();
        assertThat(drivers.get(1).get("suggestedPrice").isNull()).isTrue();
    }
}
