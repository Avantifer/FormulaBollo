package formula.bollo.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import formula.bollo.entity.Driver;
import formula.bollo.entity.Season;
import formula.bollo.entity.Team;
import formula.bollo.impl.DriverImpl;
import formula.bollo.mapper.DriverMapper;
import formula.bollo.repository.DriverRepository;
import formula.bollo.repository.ResultRepository;
import formula.bollo.service.DriverService;

class DriverTeamHistoryControllerTest {
    final DriverRepository repository = mock(DriverRepository.class);
    final DriverImpl mapper = new DriverImpl(Mappers.getMapper(DriverMapper.class));
    final ResultRepository results = mock(ResultRepository.class);
    final DriverService service = new DriverService(results, null, null, null, mapper, null, null, null, null, null);
    final DriverController controller = new DriverController(repository, mapper, service);

    @Test
    void serviceMapsOnlySeasonAndTeamForThreeSeasonsIncludingAnUnchangedTeam() {
        var history = service.getTeamHistory(List.of(driver(1, "Williams"), driver(2, "McLaren"), driver(3, "McLaren")));
        assertThat(history).extracting(entry -> entry.getSeason().getNumber()).containsExactly(1, 2, 3);
        assertThat(history).extracting(entry -> entry.getTeam().getName()).containsExactly("Williams", "McLaren", "McLaren");
        assertThat(history.getFirst().getTeam().getSeason().getNumber()).isEqualTo(1);
        assertThat(service.getTeamHistory(List.of())).isEmpty();
    }

    @Test
    void endpointAcceptsNamesWithSpacesAndReturnsChronologicalPublicDtos() throws Exception {
        when(repository.findTeamHistoryByName("Driver With Spaces"))
                .thenReturn(List.of(driver(1, "Williams"), driver(2, "McLaren"), driver(3, "McLaren")));
        MockMvcBuilders.standaloneSetup(controller).build()
                .perform(get("/drivers/teamHistory").param("driverName", "Driver With Spaces"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].season.number").value(1))
                .andExpect(jsonPath("$[0].team.name").value("Williams"))
                .andExpect(jsonPath("$[0].length()").value(2))
                .andExpect(jsonPath("$[1].season.number").value(2))
                .andExpect(jsonPath("$[1].team.name").value("McLaren"))
                .andExpect(jsonPath("$[1].length()").value(2))
                .andExpect(jsonPath("$[2].season.number").value(3))
                .andExpect(jsonPath("$[2].team.name").value("McLaren"))
                .andExpect(jsonPath("$[2].length()").value(2))
                .andExpect(jsonPath("$[0].driver").doesNotExist())
                .andExpect(jsonPath("$[0].name").doesNotExist());
        verify(repository).findTeamHistoryByName("Driver With Spaces");
        verifyNoInteractions(results);
    }

    @Test
    void unknownNameIsAnEmptyListAndMissingNameIsBadRequest() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(controller).build();
        mvc.perform(get("/drivers/teamHistory").param("driverName", "Unknown"))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
        mvc.perform(get("/drivers/teamHistory")).andExpect(status().isBadRequest());
        verifyNoInteractions(results);
    }

    private Driver driver(int number, String teamName) {
        Season season = new Season((long) number, "Season " + number, number, 2023 + number);
        return new Driver((long) number, "Driver With Spaces", 7, "driver.png", season,
                new Team((long) number, teamName, "car.png", "logo.png", season));
    }
}
