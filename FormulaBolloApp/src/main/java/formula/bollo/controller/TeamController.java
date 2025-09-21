package formula.bollo.controller;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import formula.bollo.entity.Team;
import formula.bollo.impl.TeamImpl;
import formula.bollo.model.TeamDTO;
import formula.bollo.model.TeamInfoDTO;
import formula.bollo.model.TeamPointsEvolutionDTO;
import formula.bollo.model.TeamWithDriversDTO;
import formula.bollo.repository.DriverRepository;
import formula.bollo.repository.TeamRepository;
import formula.bollo.service.TeamService;
import formula.bollo.utils.Constants;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping(path = { Constants.ENDPOINT_TEAMS })
@Tag(name = Constants.TAG_TEAM, description = Constants.TAG_TEAM_SUMMARY)
public class TeamController {

    private TeamRepository teamRepository;
    private DriverRepository driverRepository;

    private TeamImpl teamImpl;

    private TeamService teamService;

    public TeamController(
            TeamRepository teamRepository,
            DriverRepository driverRepository,
            TeamImpl teamImpl,
            TeamService teamService) {
        this.teamRepository = teamRepository;
        this.driverRepository = driverRepository;
        this.teamImpl = teamImpl;
        this.teamService = teamService;
    }

    @Operation(summary = "Get all teams", tags = Constants.TAG_TEAM)
    @GetMapping(path = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<TeamDTO> getAllTeams(@RequestParam Integer season) {
        log.info("Coger todos los equipos de la temporada " + season);
        return teamImpl.convertTeamsToTeamsDTO(teamRepository.findBySeason(season));
    }

    @Operation(summary = "Get all teams with their drivers", tags = Constants.TAG_TEAM)
    @GetMapping(path = "/withDrivers", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<TeamWithDriversDTO> getAllTeamsWithDrivers(@RequestParam Integer season) {
        log.info("Coger todos los equipos con sus pilotos de la temporada " + season);
        return teamService.getTeamWithDriversDTO(driverRepository.findAllBySeason(season));
    }

    @Operation(summary = "Get info of a team", tags = Constants.TAG_TEAM)
    @GetMapping(path = "/infoTeamByName", produces = MediaType.APPLICATION_JSON_VALUE)
    public TeamInfoDTO getInfoTeamByName(@RequestParam(required = false) Integer season,
            @RequestParam String teamName) {
        log.info("Coger la informacion del equipo " + teamName + " de la temporada " + season);
        List<Team> teams = (season == 0) ? teamRepository.findByName(teamName)
                : teamRepository.findByNameAndSeason(season, teamName);
        return this.teamService.getAllInfoTeam(teams);
    }

    @Operation(summary = "Get all info of teams", tags = Constants.TAG_TEAM)
    @GetMapping(path = "/allInfoTeam", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<TeamInfoDTO> getAllInfoTeam(@RequestParam Integer season) {
        log.info("Coger la informacion de los equipos de la temporada " + season);
        List<Team> teams = (season == 0) ? teamRepository.findAll() : teamRepository.findBySeason(season);

        List<TeamInfoDTO> teamInfoDTOs = teams.stream()
                .map(team -> this.teamService.getAllInfoTeam(List.of(team)))
                .toList();

        return this.teamService.sumDuplicates(teamInfoDTOs);
    }

    @Operation(summary = "Get all evolution points of team", tags = Constants.TAG_TEAM)
    @GetMapping(path = "/evolutionPoints", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<TeamPointsEvolutionDTO> getEvolutionPoints(@RequestParam Integer team1Id,
            @RequestParam Integer team2Id,
            @RequestParam Integer team3Id,
            @RequestParam Integer team4Id) {
        log.info("Coger todas las evoluciones de puntos de los equipos " + team1Id + ", " + team2Id + ", " + team3Id
                + ", " + team4Id);
        Set<Integer> teamIds = new HashSet<>(Arrays.asList(team1Id, team2Id, team3Id, team4Id));
        return this.teamService.getAllPointsEvolutionTeam(teamIds);
    }

}
