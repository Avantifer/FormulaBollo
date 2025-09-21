package formula.bollo.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;

import formula.bollo.entity.Race;
import formula.bollo.impl.RaceImpl;
import formula.bollo.model.RaceDTO;
import formula.bollo.repository.RaceRepository;
import formula.bollo.service.RaceService;
import formula.bollo.utils.Constants;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping(path = { Constants.ENDPOINT_RACE })
@Tag(name = Constants.TAG_RACE, description = Constants.TAG_RACE_SUMMARY)
public class RaceController {

    private RaceRepository raceRepository;
    private RaceImpl raceImpl;
    private RaceService raceService;

    public RaceController(RaceRepository raceRepository, RaceImpl raceImpl, RaceService raceService) {
        this.raceRepository = raceRepository;
        this.raceImpl = raceImpl;
        this.raceService = raceService;
    }

    @Operation(summary = "Get all races", tags = Constants.TAG_RACE)
    @GetMapping(path = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<RaceDTO> getAllRaces(@RequestParam Integer season) {
        log.info("Coger todas las carreras de la temporada " + season);
        return this.raceImpl.convertRacesToRacesDTO(raceRepository.findBySeason(season));
    }

    @Operation(summary = "Get all races finished ", tags = Constants.TAG_RACE)
    @GetMapping(path = "/allFinished", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<RaceDTO> getAllFinished(@RequestParam Integer season) {
        log.info("Coger todas las carreras terminadas de la temporada " + season);
        return this.raceImpl.convertRacesToRacesDTO(this.raceRepository.findAllFinished(season));
    }

    @Operation(summary = "Get all races finished and the next one", tags = Constants.TAG_RACE)
    @GetMapping(path = "/allFinishedAndActual", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<RaceDTO> getAllFinishedAndActual(@RequestParam Integer season) {
        log.info("Coger todas las carreras terminadas y la siguiente de la temporada " + season);
        List<Race> races = this.raceRepository.findAllFinished(season);
        Optional<Race> raceActual = this.raceRepository.findActual();

        if (raceActual.isPresent()) {
            races.add(raceActual.get());
        }

        return this.raceImpl.convertRacesToRacesDTO(races);
    }

    @Operation(summary = "Get actual race", tags = Constants.TAG_RACE)
    @GetMapping(path = "/actual", produces = MediaType.APPLICATION_JSON_VALUE)
    public RaceDTO getActualRace() {
        log.info("Coger la carrera actual");
        Optional<Race> raceActual = this.raceRepository.findActual();
        return this.raceImpl.raceToRaceDTO(raceActual.isPresent() ? raceActual.get() : new Race());
    }

    @Operation(summary = "Save a race", tags = Constants.TAG_RACE)
    @SecurityRequirement(name = "Bearer Authentication")
    @PutMapping(path = "/save", produces = MediaType.TEXT_PLAIN_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> saveRace(@RequestBody RaceDTO raceDTO) {
        log.info("Guardar la carrera " + raceDTO.toString());
        return raceService.saveRace(raceDTO);
    }
}
