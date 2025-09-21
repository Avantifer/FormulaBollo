package formula.bollo.controller;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import formula.bollo.impl.PenaltySeverityImpl;
import formula.bollo.model.PenaltySeverityDTO;
import formula.bollo.repository.PenaltySeverityRepository;
import formula.bollo.utils.Constants;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping(path = { Constants.ENDPOINT_PENALTY_SEVERITY })
@Tag(name = Constants.TAG_PENALTY_SEVERITY, description = Constants.TAG_PENALTY_SEVERITY_SUMMARY)
public class PenaltySeverityController {

    private PenaltySeverityRepository penaltySeverityRepository;
    private PenaltySeverityImpl penaltySeverityImpl;

    public PenaltySeverityController(PenaltySeverityRepository penaltySeverityRepository,
            PenaltySeverityImpl penaltySeverityImpl) {
        this.penaltySeverityRepository = penaltySeverityRepository;
        this.penaltySeverityImpl = penaltySeverityImpl;
    }

    @Operation(summary = "Get all penalties severities", tags = Constants.TAG_PENALTY_SEVERITY)
    @GetMapping(path = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<PenaltySeverityDTO> getAllPenaltiesSeverity() {
        log.info("Coger todas las severidades de las penalizaciones");
        return this.penaltySeverityImpl
                .convertPenaltySeveritiesToPenaltySeverityDTO(this.penaltySeverityRepository.findAll());
    }
}
