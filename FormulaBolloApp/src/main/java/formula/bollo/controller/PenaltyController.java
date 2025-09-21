package formula.bollo.controller;

import java.util.Comparator;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import formula.bollo.entity.Penalty;
import formula.bollo.impl.PenaltyImpl;
import formula.bollo.model.PenaltyDTO;
import formula.bollo.repository.PenaltyRepository;
import formula.bollo.service.PenaltyService;
import formula.bollo.utils.Constants;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping(path = { Constants.ENDPOINT_PENALTY })
@Tag(name = Constants.TAG_PENALTY, description = Constants.TAG_PENALTY_SUMMARY)
public class PenaltyController {

    private PenaltyRepository penaltyRepository;
    private PenaltyImpl penaltyImpl;
    private PenaltyService penaltyService;

    public PenaltyController(PenaltyRepository penaltyRepository, PenaltyImpl penaltyImpl,
            PenaltyService penaltyService) {
        this.penaltyRepository = penaltyRepository;
        this.penaltyImpl = penaltyImpl;
        this.penaltyService = penaltyService;
    }

    @Operation(summary = "Save penalties", tags = Constants.TAG_PENALTY)
    @SecurityRequirement(name = "Bearer Authentication")
    @PutMapping(path = "/save", produces = MediaType.TEXT_PLAIN_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> savePenalty(@RequestBody List<PenaltyDTO> penaltyDTOs, @RequestParam int driverId,
            @RequestParam int raceId) {
        if (penaltyDTOs == null || penaltyDTOs.isEmpty()) {
            log.info("Se va a borrar todas las penalizaciones del piloto " + driverId + " en la carrera " + raceId);
            List<Penalty> existingPenalties = penaltyRepository.findByDriverAndRace(driverId, raceId);

            if (!existingPenalties.isEmpty()) {
                penaltyRepository.deleteAll(existingPenalties);
            }
            return new ResponseEntity<>("Penalizaciones eliminadas correctamente",
                    Constants.HEADERS_TEXT_PLAIN, HttpStatus.OK);
        }

        log.info("Se va a guardar las siguientes penalizaciones " + penaltyDTOs);
        Penalty firstPenalty = penaltyImpl.penaltyDTOToPenalty(penaltyDTOs.get(0));

        List<Penalty> existingPenalties = penaltyRepository.findByDriverAndRaceAndSeverity(
                firstPenalty.getDriver().getId().intValue(),
                firstPenalty.getRace().getId().intValue(),
                firstPenalty.getPenaltySeverity().getId().intValue(),
                Constants.ACTUAL_SEASON);

        if (!existingPenalties.isEmpty()) {
            penaltyRepository.deleteAll(existingPenalties);
        }

        penaltyService.savePenalties(penaltyDTOs);

        return new ResponseEntity<>("Penalización guardada correctamente",
                Constants.HEADERS_TEXT_PLAIN, HttpStatus.OK);
    }

    @Operation(summary = "Get penalties per race", tags = Constants.TAG_PENALTY)
    @GetMapping(path = "/totalPerRace", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<PenaltyDTO> getPenaltiesByRace(@RequestParam Integer raceId) {
        log.info("Se recoge las penalizaciones de la carrera " + raceId);
        return this.penaltyImpl.convertPenaltiesToPenaltiesDTO(this.penaltyRepository.findByRaceId((long) raceId));
    }

    @Operation(summary = "Get penalties per driver", tags = Constants.TAG_PENALTY)
    @GetMapping(path = "/totalPerDriver", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<PenaltyDTO> getPenaltiesByDriver() {
        log.info("Se recoge todas las penalizaciones");
        return this.penaltyImpl
                .convertPenaltiesToPenaltiesDTO(penaltyRepository.findBySeason(Constants.ACTUAL_SEASON).stream()
                        .sorted(Comparator.comparing(p -> p.getDriver().getName()))
                        .toList());
    }

    @Operation(summary = "Get a penalty for a driver and circuit", tags = Constants.TAG_PENALTY)
    @GetMapping(path = "/perDriverPerRace", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<PenaltyDTO> getPenaltyByDriverAndRace(@RequestParam Integer driverId,
            @RequestParam Integer raceId, @RequestParam Integer severityId) {
        log.info("Se recoge la penalizacion del piloto " + driverId + " y de la carrera " + raceId
                + " y con la severidad de " + severityId);
        return this.penaltyImpl.convertPenaltiesToPenaltiesDTO(penaltyRepository
                .findByDriverAndRaceAndSeverity(driverId, raceId, severityId, Constants.ACTUAL_SEASON));
    }
}
