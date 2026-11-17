package formula.bollo.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;
import java.time.LocalDateTime;
import java.util.stream.LongStream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import formula.bollo.config.ResponseStatusExceptionHandler;
import formula.bollo.impl.ResultImpl;
import formula.bollo.entity.Result;
import formula.bollo.model.*;
import formula.bollo.repository.ResultRepository;
import formula.bollo.service.ResultService;
import tools.jackson.databind.json.JsonMapper;

class ResultControllerTest {
    private final ResultRepository repository = mock(ResultRepository.class);
    private final ResultImpl mapper = mock(ResultImpl.class);
    private final ResultService service = mock(ResultService.class);
    private final JsonMapper json = JsonMapper.builder().build();
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new ResultController(repository, mapper, service))
                .setControllerAdvice(new ResponseStatusExceptionHandler()).build();
    }

    @Test
    void fiftyOneDriversAreRejectedBeforeCallingTheService() throws Exception {
        mvc.perform(post("/results/totalPerSpecificDrivers").param("season", "1")
                .contentType("application/json").content(json.writeValueAsString(ids(51))))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith("text/plain"))
                .andExpect(content().string("Demasiados pilotos en la consulta"));
        verifyNoInteractions(service, repository, mapper);
    }

    @Test
    void fiftyDriversAreAccepted() throws Exception {
        List<Long> ids = ids(50);
        when(service.getTotalResultsSpecificPerDriver(1, ids)).thenReturn(List.of());

        mvc.perform(post("/results/totalPerSpecificDrivers").param("season", "1")
                .contentType("application/json").content(json.writeValueAsString(ids)))
                .andExpect(status().isOk()).andExpect(content().json("[]"));

        verify(service).getTotalResultsSpecificPerDriver(1, ids);
    }

    @ParameterizedTest
    @ValueSource(strings = {"[]", "null", ""})
    void emptyOrNullListsReturnEmptyResultsWithoutCallingTheService(String body) throws Exception {
        mvc.perform(post("/results/totalPerSpecificDrivers").param("season", "1")
                .contentType("application/json").content(body))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
        verifyNoInteractions(service, repository, mapper);
    }

    @Test
    void nullDriverIsRejectedBeforeCallingTheService() throws Exception {
        mvc.perform(post("/results/totalPerSpecificDrivers").param("season", "1")
                .contentType("application/json").content("[1,null]"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Demasiados pilotos en la consulta"));
        verifyNoInteractions(service, repository, mapper);
    }

    private List<Long> ids(int count) {
        return LongStream.rangeClosed(1, count).boxed().toList();
    }

    @Test
    void validResultsAreSavedWithTheRequestBody() throws Exception {
        List<ResultDTO> batch = validBatch();
        when(service.saveResults(batch)).thenReturn(ResponseEntity.ok("Resultados guardados correctamente"));

        mvc.perform(put("/results/save").contentType("application/json").content(json.writeValueAsString(batch)))
                .andExpect(status().isOk())
                .andExpect(content().string("Resultados guardados correctamente"));

        verify(service).saveResults(batch);
        verifyNoInteractions(repository, mapper);
    }

    @Test
    void badRequestFromSaveServiceIsPreserved() throws Exception {
        List<ResultDTO> batch = validBatch();
        when(service.saveResults(batch)).thenReturn(ResponseEntity.badRequest().body("Lote inválido"));

        mvc.perform(put("/results/save").contentType("application/json").content(json.writeValueAsString(batch)))
                .andExpect(status().isBadRequest()).andExpect(content().string("Lote inválido"));

        verify(service).saveResults(batch);
    }

    @Test
    void deleteDelegatesTheRequestedRace() throws Exception {
        when(service.deleteResults(5)).thenReturn(ResponseEntity.ok("Resultados borrados correctamente"));

        mvc.perform(delete("/results/delete").param("raceId", "5").contentType("application/json"))
                .andExpect(status().isOk()).andExpect(content().string("Resultados borrados correctamente"));

        verify(service).deleteResults(5);
        verifyNoInteractions(repository, mapper);
    }

    @Test
    void raceByPilotsReadsMapsAndOrdersTheRequestedRace() throws Exception {
        List<Result> rows = List.of(new Result());
        List<ResultDTO> mapped = validBatch();
        when(repository.findByRaceId(5)).thenReturn(rows);
        when(mapper.convertResultsToResultsDTO(rows)).thenReturn(mapped);
        when(service.orderResultsByPoints(mapped)).thenReturn(mapped);

        mvc.perform(get("/results/raceByPilots").param("raceId", "5"))
                .andExpect(status().isOk()).andExpect(content().json(json.writeValueAsString(mapped)));

        var calls = inOrder(repository, mapper, service);
        calls.verify(repository).findByRaceId(5);
        calls.verify(mapper).convertResultsToResultsDTO(rows);
        calls.verify(service).orderResultsByPoints(mapped);
    }

    @Test
    void raceByTeamsReadsMapsAndGroupsTheRequestedRace() throws Exception {
        List<Result> rows = List.of(new Result());
        List<ResultDTO> mapped = validBatch();
        List<ResultTeamDTO> teams = List.of(new ResultTeamDTO(mapped.getFirst().getRace(), mapped, 26, 1, 1));
        when(repository.findByRaceId(5)).thenReturn(rows);
        when(mapper.convertResultsToResultsDTO(rows)).thenReturn(mapped);
        when(service.orderResultsByPointsByTeams(mapped)).thenReturn(teams);

        mvc.perform(get("/results/raceByTeams").param("raceId", "5"))
                .andExpect(status().isOk()).andExpect(content().json(json.writeValueAsString(teams)));

        var calls = inOrder(repository, mapper, service);
        calls.verify(repository).findByRaceId(5);
        calls.verify(mapper).convertResultsToResultsDTO(rows);
        calls.verify(service).orderResultsByPointsByTeams(mapped);
    }

    private List<ResultDTO> validBatch() {
        SeasonDTO season = new SeasonDTO(2L, "Season", 2, "2026");
        RaceDTO race = new RaceDTO(5L, "GP", "", "", LocalDateTime.of(2026, 1, 1, 12, 0), season, 1);
        TeamDTO team = new TeamDTO(1L, "Team", "", "", season);
        DriverDTO driver = new DriverDTO(3L, "Ana", 3, "", season, team);
        return List.of(new ResultDTO(null, race, driver, new PositionDTO(1L, 1, 25), 1, 1));
    }
}
