package formula.bollo.controller;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import formula.bollo.impl.ResultImpl;
import formula.bollo.model.DriverPointsDTO;
import formula.bollo.model.ResultDTO;
import formula.bollo.model.ResultTeamDTO;
import formula.bollo.repository.ResultRepository;
import formula.bollo.service.ResultService;
import formula.bollo.utils.Constants;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping(path = { Constants.ENDPOINT_RESULT })
@Tag(name = Constants.TAG_RESULT, description = Constants.TAG_RESULT_SUMMARY)
public class ResultController {

    private ResultRepository resultRepository;
    private ResultImpl resultImpl;
    private ResultService resultService;

    public ResultController(ResultRepository resultRepository, ResultImpl resultImpl, ResultService resultService) {
        this.resultRepository = resultRepository;
        this.resultImpl = resultImpl;
        this.resultService = resultService;
    }

    @Operation(summary = "Get results total per driver", tags = Constants.TAG_RESULT)
    @GetMapping(path = "/totalPerDriver", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<DriverPointsDTO> getTotalResultsPerDriver(
            @RequestParam Integer season,
            @RequestParam(required = false) Integer numResults) {
        log.info("Coger todos los resultados de la temporada " + season + " y con la cantidad de " + numResults);
        return this.resultService.getTotalResultsPerDriver(season, numResults);
    }

    @Operation(summary = "Get results total per indicated driver", tags = Constants.TAG_RESULT)
    @PostMapping(path = "/totalPerSpecificDrivers", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<DriverPointsDTO> getTotalResultsSpecificPerDriver(@RequestParam("season") Integer seasonNumber,
            @RequestBody List<Long> ids) {
        log.info("Coger todos los resultados de la temporada " + seasonNumber + " y de los siguientes pilotos "
                + ids.toString());
        return this.resultService.getTotalResultsSpecificPerDriver(seasonNumber, ids);
    }

    @Operation(summary = "Get results per race by pilots", tags = Constants.TAG_RESULT)
    @GetMapping(path = "/raceByPilots", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<ResultDTO> getResultsPerRacePilots(@RequestParam Integer raceId) {
        log.info("Coger los resultados agrupados por pilotos de la carrera " + raceId);
        return this.resultService.orderResultsByPoints(
                this.resultImpl.convertResultsToResultsDTO(this.resultRepository.findByRaceId(raceId)));
    }

    @Operation(summary = "Get results per race by teams", tags = Constants.TAG_RESULT)
    @GetMapping(path = "/raceByTeams", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<ResultTeamDTO> getResultsPerRaceTeams(@RequestParam Integer raceId) {
        log.info("Coger los resultados agrupados por equipos de la carrera " + raceId);
        return this.resultService.orderResultsByPointsByTeams(
                this.resultImpl.convertResultsToResultsDTO(this.resultRepository.findByRaceId(raceId)));
    }

    @Operation(summary = "Save results", tags = Constants.TAG_RESULT)
    @SecurityRequirement(name = "Bearer Authentication")
    @PutMapping(path = "/save", produces = MediaType.TEXT_PLAIN_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> saveResults(@RequestBody List<ResultDTO> resultDTOs) {
        log.info("Guardar los siguientes resultados " + resultDTOs);
        return this.resultService.saveResults(resultDTOs);
    }

    @Operation(summary = "Delete results", tags = Constants.TAG_RESULT)
    @SecurityRequirement(name = "Bearer Authentication")
    @DeleteMapping(path = "/delete", produces = MediaType.TEXT_PLAIN_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> deleteResults(@RequestParam Integer raceId) {
        log.info("Eliminar los siguientes resultados " + raceId);
        return this.resultService.deleteResults(raceId);
    }
}
