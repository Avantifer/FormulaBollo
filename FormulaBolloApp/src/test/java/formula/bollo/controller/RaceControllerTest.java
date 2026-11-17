package formula.bollo.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import formula.bollo.config.ResponseStatusExceptionHandler;
import formula.bollo.impl.RaceImpl;
import formula.bollo.model.RaceDTO;
import formula.bollo.model.SeasonDTO;
import formula.bollo.repository.RaceRepository;
import formula.bollo.service.RaceService;
import tools.jackson.databind.json.JsonMapper;

class RaceControllerTest {
    private final RaceRepository repository = mock(RaceRepository.class);
    private final RaceImpl mapper = mock(RaceImpl.class);
    private final RaceService service = mock(RaceService.class);
    private final JsonMapper json = JsonMapper.builder().build();
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new RaceController(repository, mapper, service))
                .setControllerAdvice(new ResponseStatusExceptionHandler()).build();
    }

    @Test
    void saveDelegatesTheRequestBody() throws Exception {
        RaceDTO race = race();
        when(service.saveRace(race)).thenReturn(ResponseEntity.ok("La carrera se ha actualizado correctamente"));

        mvc.perform(put("/races/save").contentType("application/json").content(json.writeValueAsString(race)))
                .andExpect(status().isOk()).andExpect(content().string("La carrera se ha actualizado correctamente"));

        verify(service).saveRace(race);
        verifyNoInteractions(repository, mapper);
    }

    @Test
    void badRequestExceptionReturnsTheReasonAsPlainText() throws Exception {
        RaceDTO race = race();
        race.setSeason(null);
        when(service.saveRace(race)).thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "La temporada es obligatoria"));

        mvc.perform(put("/races/save").contentType("application/json").content(json.writeValueAsString(race)))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith("text/plain"))
                .andExpect(content().string("La temporada es obligatoria"));

        verify(service).saveRace(race);
        verifyNoInteractions(repository, mapper);
    }

    private RaceDTO race() {
        return new RaceDTO(5L, "GP", "", "", LocalDateTime.of(2026, 1, 1, 12, 0),
                new SeasonDTO(2L, "Season", 2, "2026"), 0);
    }
}
