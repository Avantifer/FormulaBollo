package formula.bollo.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import formula.bollo.model.RaceCloseDTO;
import formula.bollo.service.RaceCloseService;
import formula.bollo.utils.Constants;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping(Constants.ENDPOINT_RACE)
@Tag(name = Constants.TAG_RACE, description = Constants.TAG_RACE_SUMMARY)
public class RaceCloseController {
    private final RaceCloseService raceCloseService;

    public RaceCloseController(RaceCloseService raceCloseService) {
        this.raceCloseService = raceCloseService;
    }

    @Operation(summary = "Close a race with results, Fantasy points and next race prices", tags = Constants.TAG_RACE)
    @SecurityRequirement(name = "Bearer Authentication")
    @PutMapping(path = "/close", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> closeRace(@RequestBody RaceCloseDTO request) {
        return raceCloseService.closeRace(request);
    }
}
