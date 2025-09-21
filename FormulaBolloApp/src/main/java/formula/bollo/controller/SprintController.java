package formula.bollo.controller;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import formula.bollo.impl.SprintImpl;
import formula.bollo.model.SprintDTO;
import formula.bollo.repository.SprintRepository;
import formula.bollo.service.SprintService;
import formula.bollo.utils.Constants;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping(path = { Constants.ENDPOINT_SPRINT })
@Tag(name = Constants.TAG_SPRINT, description = Constants.TAG_SPRINT_SUMMARY)
public class SprintController {

    private SprintRepository sprintRepository;
    private SprintImpl sprintImpl;
    private SprintService sprintService;

    public SprintController(SprintRepository sprintRepository, SprintImpl sprintImpl, SprintService sprintService) {
        this.sprintRepository = sprintRepository;
        this.sprintImpl = sprintImpl;
        this.sprintService = sprintService;
    }

    @Operation(summary = "Get sprints per race", tags = Constants.TAG_SPRINT)
    @GetMapping(path = "/race", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<SprintDTO> getSprintsPerRace(@RequestParam Integer raceId) {
        log.info("Coger las sprints por la carrera " + raceId);
        return this.sprintService.orderSprintsByPoints(
                this.sprintImpl.convertSprintsToSprintsDTO(this.sprintRepository.findByRaceId(raceId)));
    }

    @Operation(summary = "Save sprints", tags = Constants.TAG_SPRINT)
    @SecurityRequirement(name = "Bearer Authentication")
    @PutMapping(path = "/save", produces = MediaType.TEXT_PLAIN_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> saveSprintsCircuit(@RequestBody List<SprintDTO> sprintDTOs) {
        log.info("Guardar las siguientes sprints " + sprintDTOs);
        return this.sprintService.saveSprints(sprintDTOs);
    }

    @Operation(summary = "Delete sprints", tags = Constants.TAG_RESULT)
    @SecurityRequirement(name = "Bearer Authentication")
    @DeleteMapping(path = "/delete", produces = MediaType.TEXT_PLAIN_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> deleteSprints(@RequestParam Integer raceId) {
        log.info("Eliminar los siguientes resultados " + raceId);
        return this.sprintService.deleteSprints(raceId);
    }
}
