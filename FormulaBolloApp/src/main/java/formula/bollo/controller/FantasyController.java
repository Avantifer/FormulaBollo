package formula.bollo.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import formula.bollo.entity.FantasyPointsDriver;
import formula.bollo.entity.FantasyPointsTeam;
import formula.bollo.impl.FantasyPointsImpl;
import formula.bollo.impl.FantasyPriceImpl;
import formula.bollo.model.FantasyElectionDTO;
import formula.bollo.model.FantasyPointsAccountDTO;
import formula.bollo.model.FantasyPointsDriverDTO;
import formula.bollo.model.FantasyPointsTeamDTO;
import formula.bollo.model.FantasyPriceDriverDTO;
import formula.bollo.model.FantasyPriceTeamDTO;
import formula.bollo.repository.FantasyPointsDriverRepository;
import formula.bollo.repository.FantasyPointsTeamRepository;
import formula.bollo.repository.FantasyPriceDriverRepository;
import formula.bollo.repository.FantasyPriceTeamRepository;
import formula.bollo.service.FantasyService;
import formula.bollo.utils.Constants;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping(path = { Constants.ENDPOINT_FANTASY })
@Tag(name = Constants.TAG_FANTASY, description = Constants.TAG_FANTASY_SUMMARY)
public class FantasyController {

    private FantasyPointsDriverRepository fantasyPointsDriverRepository;
    private FantasyPriceDriverRepository fantasyPriceDriverRepository;
    private FantasyPriceTeamRepository fantasyPriceTeamRepository;
    private FantasyPointsTeamRepository fantasyPointsTeamRepository;

    private FantasyPriceImpl fantasyPriceImpl;
    private FantasyPointsImpl fantasyPointsImpl;

    private FantasyService fantasyService;

    public FantasyController(
            FantasyPointsDriverRepository fantasyPointsDriverRepository,
            FantasyPriceDriverRepository fantasyPriceDriverRepository,
            FantasyPriceTeamRepository fantasyPriceTeamRepository,
            FantasyPointsTeamRepository fantasyPointsTeamRepository,
            FantasyPriceImpl fantasyPriceImpl,
            FantasyPointsImpl fantasyPointsImpl,
            FantasyService fantasyService) {
        this.fantasyPointsDriverRepository = fantasyPointsDriverRepository;
        this.fantasyPriceDriverRepository = fantasyPriceDriverRepository;
        this.fantasyPriceTeamRepository = fantasyPriceTeamRepository;
        this.fantasyPointsTeamRepository = fantasyPointsTeamRepository;
        this.fantasyPriceImpl = fantasyPriceImpl;
        this.fantasyPointsImpl = fantasyPointsImpl;
        this.fantasyService = fantasyService;
    }

    @Operation(summary = "Save driver's and team's points", tags = Constants.TAG_FANTASY)
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping(value = "/saveDriverTeamPoints", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> saveDriverTeamPoints(@RequestParam Integer raceId) {
        log.info("Guardo los puntos de los equipos y pilotos fantasy y la carrera " + raceId);
        return this.fantasyService.saveDriverTeamPoints(raceId);
    }

    @Operation(summary = "Save driver's and team's prices", tags = Constants.TAG_FANTASY)
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping(value = "/saveDriverTeamPrices", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> saveDriverTeamPrices(@RequestParam Integer raceId) {
        log.info("Guardo los precios de los equipos y pilotos fantasy de la carrera " + raceId);
        return this.fantasyService.saveDriverTeamPrices(raceId);
    }

    @Operation(summary = "Save fantasy Election", tags = Constants.TAG_FANTASY)
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping(path = "/saveFantasyElection", produces = MediaType.TEXT_PLAIN_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> saveFantasyElection(@RequestBody FantasyElectionDTO fantasyElectionDTO) {
        log.info("Guardo la eleccion del fantasy de " + fantasyElectionDTO.getAccount().getUsername());
        return this.fantasyService.saveFantasyElection(fantasyElectionDTO);
    }

    @Operation(summary = "Get all driver's fantasy points", tags = Constants.TAG_FANTASY)
    @GetMapping(path = "/allDriverPoints", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<FantasyPointsDriverDTO> getAllDriverPoints(@RequestParam Integer raceId) {
        log.info("Coger todos los puntos del fantasy de los pilotos de la carrera " + raceId);
        return this.fantasyPointsImpl.convertFantasyPointsDriverToFantasyPointsDriverDTO(
                this.fantasyPointsDriverRepository.findByRaceId(raceId));
    }

    @Operation(summary = "Get all team's fantasy points", tags = Constants.TAG_FANTASY)
    @GetMapping(path = "/allTeamPoints", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<FantasyPointsTeamDTO> getAllTeamPoints(@RequestParam Integer raceId) {
        log.info("Coger todos los puntos del fantasy de los equipos de la carrera " + raceId);
        return this.fantasyPointsImpl
                .convertFantasyPointsTeamToFantasyPointsTeamDTO(this.fantasyPointsTeamRepository.findByRaceId(raceId));
    }

    @Operation(summary = "Get fantasy points of a driver", tags = Constants.TAG_FANTASY)
    @GetMapping(path = "/driverPointsSpecificRace", produces = MediaType.APPLICATION_JSON_VALUE)
    public FantasyPointsDriverDTO getDriverPointsSpecificRace(@RequestParam Integer driverId,
            @RequestParam Integer raceId) {
        log.info("Coger los puntos del fantasy del piloto " + driverId + " y la carrera " + raceId);
        Optional<FantasyPointsDriver> fantasyPointsDriver = this.fantasyPointsDriverRepository
                .findByDriverIdAndRaceId(driverId, raceId);
        return fantasyPointsDriver.isPresent()
                ? this.fantasyPointsImpl.fantasyPointsDriverToFantasyPointsDriverDTO(fantasyPointsDriver.get())
                : null;
    }

    @Operation(summary = "Get fantasy points of a team", tags = Constants.TAG_FANTASY)
    @GetMapping(path = "/teamsPointsSpecificRace", produces = MediaType.APPLICATION_JSON_VALUE)
    public FantasyPointsTeamDTO teamsPointsSpecificRace(@RequestParam Integer teamId, @RequestParam Integer raceId) {
        log.info("Coger los puntos del fantasy del equipo " + teamId + " y la carrera " + raceId);
        Optional<FantasyPointsTeam> fantasyPointsTeam = this.fantasyPointsTeamRepository.findByTeamIdAndRaceId(teamId,
                raceId);
        return fantasyPointsTeam.isPresent()
                ? this.fantasyPointsImpl.fantasyPointsTeamToFantasyPointsTeamDTO(fantasyPointsTeam.get())
                : null;
    }

    @Operation(summary = "Get all drivers' prices", tags = Constants.TAG_FANTASY)
    @GetMapping(path = "/allDriverPrices", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<FantasyPriceDriverDTO> getAllDriverPrices(@RequestParam Integer raceId) {
        log.info("Coger todos los precios del fantasy de los pilotos de la carrera " + raceId);
        return this.fantasyService.getAllDriverPrices(raceId);
    }

    @Operation(summary = "Get teams' prices", tags = Constants.TAG_FANTASY)
    @GetMapping(path = "/allTeamPrices", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<FantasyPriceTeamDTO> getAllTeamPrices(@RequestParam Integer raceId) {
        log.info("Coger todos los precios del fantasy de los equipos de la carrera " + raceId);
        return this.fantasyService.getAllTeamPrices(raceId);
    }

    @Operation(summary = "Get fantasy election", tags = Constants.TAG_FANTASY)
    @GetMapping(path = "/fantasyElection", produces = MediaType.APPLICATION_JSON_VALUE)
    public FantasyElectionDTO getFantasyElection(@RequestParam int raceId, @RequestParam int userId) {
        log.info("Coger la eleccion del fantasy del usuario  " + userId + " y de la carrera " + raceId);
        return this.fantasyService.getFantasyElection(raceId, userId);
    }

    @Operation(summary = "Get all fantasy points of season")
    @GetMapping(path = "/getFantasyPointsSeason", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<FantasyPointsAccountDTO> getFantasyPointsSeason(@RequestParam Integer numberSeason) {
        log.info("Coger los puntos del fantasy de la temporada " + numberSeason);
        return this.fantasyService.sumAllFantasyPoints(numberSeason);
    }

    @Operation(summary = "Get all fantasy points of reace", tags = Constants.TAG_FANTASY)
    @GetMapping(path = "/getFantasyPointsRace", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<FantasyPointsAccountDTO> getFantasyPointsRace(@RequestParam Integer raceId) {
        log.info("Coger los puntos del fantasy de la carrera " + raceId);
        return this.fantasyService.getFantasyPoints(raceId);
    }

    @Operation(summary = "Get driver's prices", tags = Constants.TAG_FANTASY)
    @GetMapping(path = "/driverPrice", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<FantasyPriceDriverDTO> getDriverPrices(@RequestParam Integer driverId) {
        log.info("Coger los precios del fantasy del piloto" + driverId);
        return this.fantasyPriceImpl.convertFantasyPriceDriverToFantasyPriceDriverDTO(
                this.fantasyPriceDriverRepository.findByDriverId(driverId));
    }

    @Operation(summary = "Get driver's points", tags = Constants.TAG_FANTASY)
    @GetMapping(path = "/driverPoints", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<FantasyPointsDriverDTO> getDriverPoints(@RequestParam Integer driverId) {
        log.info("Coger los puntos del fantasy del piloto " + driverId);
        return this.fantasyPointsImpl.convertFantasyPointsDriverToFantasyPointsDriverDTO(
                this.fantasyPointsDriverRepository.findByDriverId(driverId));
    }

    @Operation(summary = "Get team's prices", tags = Constants.TAG_FANTASY)
    @GetMapping(path = "/teamPrice", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<FantasyPriceTeamDTO> getTeamPrice(@RequestParam Integer teamId) {
        log.info("Coger los precios del fantasy del equipo " + teamId);
        return this.fantasyPriceImpl
                .convertFantasyPriceTeamToFantasyPriceTeamDTO(this.fantasyPriceTeamRepository.findByTeamId(teamId));
    }

    @Operation(summary = "Get team's points", tags = Constants.TAG_FANTASY)
    @GetMapping(path = "/teamPoints", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<FantasyPointsTeamDTO> getTeamPoints(@RequestParam Integer teamId) {
        log.info("Coger los puntos del fantasy del equipo " + teamId);
        return this.fantasyPointsImpl
                .convertFantasyPointsTeamToFantasyPointsTeamDTO(this.fantasyPointsTeamRepository.findByTeamId(teamId));
    }
}
