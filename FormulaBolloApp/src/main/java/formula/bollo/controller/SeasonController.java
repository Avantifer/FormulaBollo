package formula.bollo.controller;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import formula.bollo.impl.SeasonImpl;
import formula.bollo.model.SeasonDTO;
import formula.bollo.repository.SeasonRepository;
import formula.bollo.utils.Constants;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;

import org.springframework.web.bind.annotation.RequestParam;

@Slf4j
@RestController
@RequestMapping(path = { Constants.ENDPOINT_SEASONS })
@Tag(name = Constants.TAG_SEASON, description = Constants.TAG_SEASON_SUMMARY)
public class SeasonController {

    private final SeasonRepository seasonRepository;
    private final SeasonImpl seasonImpl;

    public SeasonController(SeasonRepository seasonRepository, SeasonImpl seasonImpl) {
        this.seasonRepository = seasonRepository;
        this.seasonImpl = seasonImpl;
    }

    @Operation(summary = "Get all seasons", tags = Constants.TAG_SEASON)
    @GetMapping(path = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<SeasonDTO> getAllConfigurations() {
        log.info("Coger todas las temporadas");
        return this.seasonImpl.convertSeasonsToSeasonsDTO(seasonRepository.findAll());
    }

    @Operation(summary = "Get actual season", tags = Constants.TAG_SEASON)
    @GetMapping(path = "/actual", produces = MediaType.APPLICATION_JSON_VALUE)
    public SeasonDTO getActualSeasonDTO() {
        log.info("Coger la temporada actual");
        return this.seasonImpl.seasonToSeasonDTO(seasonRepository.findByNumber(Constants.ACTUAL_SEASON));
    }

    @Operation(summary = "Get seasons by Team's name", tags = Constants.TAG_SEASON)
    @GetMapping(path = "/byTeamName", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<SeasonDTO> getSeasonsByTeamName(@RequestParam String teamName) {
        log.info("Coger las temporadas del equipo " + teamName);
        return this.seasonImpl.convertSeasonsToSeasonsDTO(this.seasonRepository.findSeasonsByTeamName(teamName));
    }

    @Operation(summary = "Get seasons by Driver's name", tags = Constants.TAG_SEASON)
    @GetMapping(path = "/byDriverName", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<SeasonDTO> getSeasonsByDriverName(@RequestParam String driverName) {
        log.info("Coger las temporadas del piloto " + driverName);
        return this.seasonImpl.convertSeasonsToSeasonsDTO(this.seasonRepository.findSeasonsByDriverName(driverName));
    }

    @Operation(summary = "Get seasons of fantasy", tags = Constants.TAG_SEASON)
    @GetMapping(path = "/fantasy", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<SeasonDTO> seasonsOfFantasy() {
        log.info("Coger las temporadas del fantasy");
        return this.seasonImpl.convertSeasonsToSeasonsDTO(this.seasonRepository.findSeasonsByFantasyElection());
    }
}
