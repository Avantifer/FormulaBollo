package formula.bollo.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import formula.bollo.entity.Race;
import formula.bollo.entity.Season;
import formula.bollo.impl.DriverImpl;
import formula.bollo.impl.RaceImpl;
import formula.bollo.impl.TeamImpl;
import formula.bollo.repository.DriverRepository;
import formula.bollo.repository.RaceRepository;
import formula.bollo.repository.TeamRepository;
import formula.bollo.service.DriverService;
import formula.bollo.service.RaceService;
import formula.bollo.service.TeamService;

class OptionalSeasonControllerTest {
    @Test
    void omittedDriverSeasonBehavesLikeZero() throws Exception {
        DriverRepository drivers = mock(DriverRepository.class);
        DriverController controller = new DriverController(drivers, mock(DriverImpl.class), mock(DriverService.class));
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller).build();

        mvc.perform(get("/drivers/byTeamName").param("teamName", "Team")).andExpect(status().isOk());
        mvc.perform(get("/drivers/byTeamName").param("teamName", "Team").param("season", "0"))
                .andExpect(status().isOk());
        mvc.perform(get("/drivers/infoDriverByName").param("driverName", "Driver")).andExpect(status().isOk());
        mvc.perform(get("/drivers/infoDriverByName").param("driverName", "Driver").param("season", "0"))
                .andExpect(status().isOk());

        verify(drivers, times(2)).findByTeamName("Team");
        verify(drivers, times(2)).findByName("Driver");
        verifyNoMoreInteractions(drivers);
    }

    @Test
    void omittedTeamSeasonBehavesLikeZero() throws Exception {
        TeamRepository teams = mock(TeamRepository.class);
        TeamController controller = new TeamController(teams, mock(DriverRepository.class), mock(TeamImpl.class),
                mock(TeamService.class));
        MockMvc mvc = MockMvcBuilders.standaloneSetup(controller).build();

        mvc.perform(get("/teams/infoTeamByName").param("teamName", "Team")).andExpect(status().isOk());
        mvc.perform(get("/teams/infoTeamByName").param("teamName", "Team").param("season", "0"))
                .andExpect(status().isOk());

        verify(teams, times(2)).findByName("Team");
        verifyNoMoreInteractions(teams);
    }

    @Test
    void finishedAndPendingRacesUseRequestedSeasonAndChronologicalOrder() throws Exception {
        RaceRepository races = mock(RaceRepository.class);
        RaceImpl mapper = mock(RaceImpl.class);
        Season season = new Season(2L, "Season", 2, 2025);
        LocalDateTime date = LocalDateTime.of(2025, 1, 1, 0, 0);
        Race first = new Race(9L, "First", "", "", date, season, 1);
        Race second = new Race(1L, "Second", "", "", date.plusDays(1), season, 1);
        Race tied = new Race(2L, "Tied", "", "", second.getDateStart(), season, 1);
        Race pending = new Race(3L, "Pending", "", "", date.plusDays(7), season, 0);
        when(races.findAllFinished(2)).thenReturn(List.of(tied, second, first));
        when(races.findActualBySeason(2)).thenReturn(Optional.of(pending));
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new RaceController(races, mapper, mock(RaceService.class))).build();

        mvc.perform(get("/races/allFinishedAndActual").param("season", "2")).andExpect(status().isOk());

        ArgumentCaptor<List<Race>> selected = ArgumentCaptor.captor();
        verify(mapper).convertRacesToRacesDTO(selected.capture());
        assertEquals(List.of(first, second, tied, pending), selected.getValue());
        verify(races).findActualBySeason(2);
        verify(races, never()).findActual();
    }
}
