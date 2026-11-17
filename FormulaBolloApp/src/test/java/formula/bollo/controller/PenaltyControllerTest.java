package formula.bollo.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import formula.bollo.config.ResponseStatusExceptionHandler;
import formula.bollo.impl.PenaltyImpl;
import formula.bollo.model.PenaltyDTO;
import formula.bollo.repository.PenaltyRepository;
import formula.bollo.service.PenaltyService;
import tools.jackson.databind.json.JsonMapper;

class PenaltyControllerTest {
    private final PenaltyRepository repository = mock(PenaltyRepository.class);
    private final PenaltyImpl mapper = mock(PenaltyImpl.class);
    private final PenaltyService service = mock(PenaltyService.class);
    private final JsonMapper json = JsonMapper.builder().build();
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new PenaltyController(repository, mapper, service))
                .setControllerAdvice(new ResponseStatusExceptionHandler()).build();
    }

    @Test
    void emptyListDeletesPenaltiesForTheRequestedDriverAndRace() throws Exception {
        mvc.perform(put("/penalties/save").param("driverId", "3").param("raceId", "5")
                .contentType("application/json").content("[]"))
                .andExpect(status().isOk()).andExpect(content().string("Penalizaciones eliminadas correctamente"));

        verify(service).savePenalties(List.of(), 3, 5);
        verifyNoInteractions(repository, mapper);
    }

    @Test
    void nonEmptyListSavesTheRequestBody() throws Exception {
        PenaltyDTO penalty = new PenaltyDTO();
        penalty.setReason("Límites de pista");
        List<PenaltyDTO> batch = List.of(penalty);

        mvc.perform(put("/penalties/save").param("driverId", "3").param("raceId", "5")
                .contentType("application/json").content(json.writeValueAsString(batch)))
                .andExpect(status().isOk()).andExpect(content().string("Penalización guardada correctamente"));

        verify(service).savePenalties(batch, 3, 5);
        verifyNoInteractions(repository, mapper);
    }

    @Test
    void badRequestExceptionReturnsTheReasonAsPlainText() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Piloto inválido"))
                .when(service).savePenalties(List.of(), 3, 5);

        mvc.perform(put("/penalties/save").param("driverId", "3").param("raceId", "5")
                .contentType("application/json").content("[]"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith("text/plain"))
                .andExpect(content().string("Piloto inválido"));

        verify(service).savePenalties(List.of(), 3, 5);
        verifyNoInteractions(repository, mapper);
    }
}
