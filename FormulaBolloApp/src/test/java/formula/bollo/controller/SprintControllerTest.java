package formula.bollo.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import formula.bollo.config.ResponseStatusExceptionHandler;
import formula.bollo.entity.Sprint;
import formula.bollo.impl.SprintImpl;
import formula.bollo.model.*;
import formula.bollo.repository.SprintRepository;
import formula.bollo.service.SprintService;
import tools.jackson.databind.json.JsonMapper;

class SprintControllerTest {
    private final SprintRepository repository = mock(SprintRepository.class);
    private final SprintImpl mapper = mock(SprintImpl.class);
    private final SprintService service = mock(SprintService.class);
    private final JsonMapper json = JsonMapper.builder().build();
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new SprintController(repository, mapper, service))
                .setControllerAdvice(new ResponseStatusExceptionHandler()).build();
    }

    @Test
    void validSprintsAreSavedWithTheRequestBody() throws Exception {
        List<SprintDTO> batch = validBatch();
        when(service.saveSprints(batch)).thenReturn(ResponseEntity.ok("Resultados de la sprint guardados correctamente"));

        mvc.perform(put("/sprints/save").contentType("application/json").content(json.writeValueAsString(batch)))
                .andExpect(status().isOk())
                .andExpect(content().string("Resultados de la sprint guardados correctamente"));

        verify(service).saveSprints(batch);
        verifyNoInteractions(repository, mapper);
    }

    @Test
    void badRequestFromSaveServiceIsPreserved() throws Exception {
        List<SprintDTO> batch = validBatch();
        when(service.saveSprints(batch)).thenReturn(ResponseEntity.badRequest().body("Lote inválido"));

        mvc.perform(put("/sprints/save").contentType("application/json").content(json.writeValueAsString(batch)))
                .andExpect(status().isBadRequest()).andExpect(content().string("Lote inválido"));

        verify(service).saveSprints(batch);
    }

    @Test
    void deleteDelegatesTheRequestedRace() throws Exception {
        when(service.deleteSprints(5)).thenReturn(ResponseEntity.ok("Resultados de la sprint borrados correctamente"));

        mvc.perform(delete("/sprints/delete").param("raceId", "5").contentType("application/json"))
                .andExpect(status().isOk()).andExpect(content().string("Resultados de la sprint borrados correctamente"));

        verify(service).deleteSprints(5);
        verifyNoInteractions(repository, mapper);
    }

    @Test
    void raceReadsMapsAndOrdersTheRequestedRace() throws Exception {
        List<Sprint> rows = List.of(new Sprint());
        List<SprintDTO> mapped = validBatch();
        when(repository.findByRaceId(5)).thenReturn(rows);
        when(mapper.convertSprintsToSprintsDTO(rows)).thenReturn(mapped);
        when(service.orderSprintsByPoints(mapped)).thenReturn(mapped);

        mvc.perform(get("/sprints/race").param("raceId", "5"))
                .andExpect(status().isOk()).andExpect(content().json(json.writeValueAsString(mapped)));

        var calls = inOrder(repository, mapper, service);
        calls.verify(repository).findByRaceId(5);
        calls.verify(mapper).convertSprintsToSprintsDTO(rows);
        calls.verify(service).orderSprintsByPoints(mapped);
    }

    private List<SprintDTO> validBatch() {
        SeasonDTO season = new SeasonDTO(2L, "Season", 2, "2026");
        RaceDTO race = new RaceDTO(5L, "GP", "", "", LocalDateTime.of(2026, 1, 1, 12, 0), season, 1);
        TeamDTO team = new TeamDTO(1L, "Team", "", "", season);
        DriverDTO driver = new DriverDTO(3L, "Ana", 3, "", season, team);
        return List.of(new SprintDTO(null, race, driver, new SprintPositionDTO(1L, 1, 8)));
    }
}
