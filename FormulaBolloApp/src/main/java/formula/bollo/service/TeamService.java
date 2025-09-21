package formula.bollo.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import formula.bollo.entity.Driver;
import formula.bollo.entity.Race;
import formula.bollo.entity.Result;
import formula.bollo.entity.Sprint;
import formula.bollo.entity.Team;
import formula.bollo.enums.PositionChange;
import formula.bollo.impl.DriverImpl;
import formula.bollo.impl.RaceImpl;
import formula.bollo.impl.ResultImpl;
import formula.bollo.impl.TeamImpl;
import formula.bollo.model.DriverDTO;
import formula.bollo.model.DriverInfoDTO;
import formula.bollo.model.DriverPointsDTO;
import formula.bollo.model.RaceDTO;
import formula.bollo.model.ResultDTO;
import formula.bollo.model.ResultTeamDTO;
import formula.bollo.model.TeamDTO;
import formula.bollo.model.TeamInfoDTO;
import formula.bollo.model.TeamPointsEvolutionDTO;
import formula.bollo.model.TeamWithDriversDTO;
import formula.bollo.repository.ConstructorRepository;
import formula.bollo.repository.DriverRepository;
import formula.bollo.repository.ResultRepository;
import formula.bollo.repository.SprintRepository;

@Service
public class TeamService {
    private ResultRepository resultRepository;
    private SprintRepository sprintRepository;
    private DriverRepository driverRepository;
    private ConstructorRepository constructorRepository;

    private TeamImpl teamImpl;
    private DriverImpl driverImpl;
    private ResultImpl resultImpl;
    private RaceImpl raceImpl;

    private DriverService driverService;

    public TeamService(
            ResultRepository resultRepository,
            SprintRepository sprintRepository,
            DriverRepository driverRepository,
            ConstructorRepository constructorRepository,
            TeamImpl teamImpl,
            DriverImpl driverImpl,
            ResultImpl resultImpl,
            RaceImpl raceImpl,
            DriverService driverService) {
        this.resultRepository = resultRepository;
        this.sprintRepository = sprintRepository;
        this.driverRepository = driverRepository;
        this.constructorRepository = constructorRepository;
        this.teamImpl = teamImpl;
        this.driverImpl = driverImpl;
        this.resultImpl = resultImpl;
        this.raceImpl = raceImpl;
        this.driverService = driverService;
    }

    /**
     * Gets a list of TeamWithDriversDTO objects based on a list of drivers.
     *
     * @param drivers The list of drivers to group by team and calculate points.
     * @return A sorted list of TeamWithDriversDTO objects.
     */
    public List<TeamWithDriversDTO> getTeamWithDriversDTO(List<Driver> drivers) {
        List<Long> driverIds = drivers.stream()
                .map(Driver::getId)
                .toList();

        List<Result> allResults = resultRepository.findByDriverIds(driverIds);
        List<Sprint> allSprints = sprintRepository.findByDriverIds(driverIds);

        Map<Long, List<Result>> resultsByDriver = allResults.stream()
                .collect(Collectors.groupingBy(result -> result.getDriver().getId()));
        Map<Long, List<Sprint>> sprintsByDriver = allSprints.stream()
                .collect(Collectors.groupingBy(sprint -> sprint.getDriver().getId()));

        List<TeamWithDriversDTO> teamWithDriversDTOs = drivers.stream()
                .collect(Collectors.groupingBy(Driver::getTeam))
                .entrySet().stream()
                .map(entry -> {
                    Team team = entry.getKey();
                    List<Driver> teamDrivers = entry.getValue();
                    int totalPoints = this.calculatePoints(teamDrivers, resultsByDriver, sprintsByDriver);

                    return this.assignTeamWithDrivers(teamDrivers, team, totalPoints, resultsByDriver, sprintsByDriver);
                })
                .sorted(Comparator.comparingInt(TeamWithDriversDTO::getTotalPoints).reversed())
                .toList();

        if (!allResults.isEmpty()) {
            this.getOverallTeamPositionChanges(teamWithDriversDTOs,
                    allResults.get(allResults.size() - 1).getRace().getId().intValue());
        }

        return teamWithDriversDTOs;
    }

    /**
     * Calculates total points for a list of team drivers.
     *
     * @param teamDrivers The list of team drivers.
     * @return The total points for the team.
     */
    private int calculatePoints(List<Driver> teamDrivers, Map<Long, List<Result>> resultsByDriver,
            Map<Long, List<Sprint>> sprintsByDriver) {
        return teamDrivers.stream()
                .mapToInt(driver -> {
                    int resultPoints = this.calculatePointsResults(driver, resultsByDriver);
                    int sprintPoints = this.calculatePointsSprints(driver, sprintsByDriver);
                    return resultPoints + sprintPoints;
                })
                .sum();
    }

    /**
     * Calculates total points for race results of a driver.
     *
     * @param driver The driver for whom points are calculated.
     * @return The total points for race results.
     */
    private int calculatePointsResults(Driver driver, Map<Long, List<Result>> resultsByDriver) {
        List<Result> results = resultsByDriver.getOrDefault(driver.getId(), Collections.emptyList());

        return results.stream()
                .filter(result -> result.getPosition() != null)
                .mapToInt(result -> result.getPosition().getPoints() + result.getFastlap())
                .sum();
    }

    /**
     * Calculates total points for sprint results of a driver.
     *
     * @param driver          The driver for whom points are calculated.
     * @param sprintsByDriver The map of sprints by driver.
     * @return The total points for sprint results.
     */
    private int calculatePointsSprints(Driver driver, Map<Long, List<Sprint>> sprintsByDriver) {
        List<Sprint> sprints = sprintsByDriver.getOrDefault(driver.getId(), Collections.emptyList());

        return sprints.stream()
                .filter(sprint -> sprint.getPosition() != null)
                .mapToInt(sprint -> sprint.getPosition().getPoints())
                .sum();
    }

    /**
     * Assigns a TeamWithDriversDTO object with team and driver information.
     *
     * @param teamDrivers The list of team drivers.
     * @param team        The team for which the DTO is created.
     * @param totalPoints The total points for the team.
     * @return The TeamWithDriversDTO object.
     */
    private TeamWithDriversDTO assignTeamWithDrivers(
            List<Driver> teamDrivers,
            Team team,
            int totalPoints,
            Map<Long, List<Result>> resultsByDriver,
            Map<Long, List<Sprint>> sprintsByDriver) {
        TeamWithDriversDTO teamWithDrivers = new TeamWithDriversDTO();
        teamWithDrivers.setTeam(teamImpl.teamToTeamDTO(team));
        teamWithDrivers.setTotalPoints(totalPoints);

        Driver driver1Entity = teamDrivers.get(0);
        int driver1Points = calculatePointsResults(driver1Entity, resultsByDriver)
                + calculatePointsSprints(driver1Entity, sprintsByDriver);
        DriverDTO driver1DTO = driverImpl.driverToDriverDTO(driver1Entity);
        DriverPointsDTO driver1PointsDTO = new DriverPointsDTO(driver1DTO, driver1Points);
        teamWithDrivers.setDriver1(driver1PointsDTO);

        if (teamDrivers.size() > 1) {
            Driver driver2Entity = teamDrivers.get(1);
            int driver2Points = calculatePointsResults(driver2Entity, resultsByDriver)
                    + calculatePointsSprints(driver2Entity, sprintsByDriver);
            DriverDTO driver2DTO = driverImpl.driverToDriverDTO(driver2Entity);
            DriverPointsDTO driver2PointsDTO = new DriverPointsDTO(driver2DTO, driver2Points);
            teamWithDrivers.setDriver2(driver2PointsDTO);
        }

        return teamWithDrivers;
    }

    /**
     * Retrieves all type of info by the team name
     *
     * @param teams list of the teams with the name filter
     */
    public TeamInfoDTO getAllInfoTeam(List<Team> teams) {
        if (teams.isEmpty())
            return null;

        TeamDTO teamDTO = teamImpl.teamToTeamDTO(teams.get(teams.size() - 1));
        List<Long> idsList = teams.stream().map(Team::getId).toList();

        int constructors = this.constructorRepository.findByTeamId(idsList);

        List<Driver> allDrivers = teams.stream()
                .flatMap(team -> this.driverRepository.findByTeamId(team.getId()).stream())
                .toList();

        DriverInfoDTO driverInfo = this.driverService.getAllInfoDriver(allDrivers);

        if (driverInfo == null) {
            return new TeamInfoDTO(teamDTO, constructors);
        } else {
            List<ResultTeamDTO> resultsGrouped = this.groupResultsByRace(
                    this.resultImpl.convertResultsToResultsDTO(this.resultRepository.last5ResultsByTeamIds(idsList)));

            if (!resultsGrouped.isEmpty()) {
                int lastSize = resultsGrouped.size() < 5 ? resultsGrouped.size() : 5;
                resultsGrouped = resultsGrouped.subList(0, lastSize);
            }

            return new TeamInfoDTO(teamDTO, constructors, driverInfo, resultsGrouped);
        }
    }

    /**
     * Groups the results by race and calculates the total points, fast laps and
     * poles for each
     *
     * @param results a list of ResultDTO objects
     */
    private List<ResultTeamDTO> groupResultsByRace(List<ResultDTO> results) {
        return results.stream()
                .collect(Collectors.groupingBy(
                        result -> result.getRace().getId(),
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                groupedResults -> {
                                    ResultTeamDTO dto = new ResultTeamDTO();
                                    RaceDTO race = groupedResults.get(0).getRace();

                                    dto.setResults(groupedResults);
                                    dto.setRace(race);
                                    dto.setTotalPoints(
                                            groupedResults.stream()
                                                    .mapToInt(result -> result.getPosition() != null
                                                            ? result.getPosition().getPoints()
                                                            : 0)
                                                    .sum());
                                    dto.setHasFastLap(
                                            groupedResults.stream()
                                                    .anyMatch(r -> r.getFastlap() == 1) ? 1 : 0);
                                    dto.setHasPole(
                                            groupedResults.stream()
                                                    .anyMatch(r -> r.getPole() == 1) ? 1 : 0);

                                    return dto;
                                })))
                .values()
                .stream()
                .sorted(Comparator.comparing(dto -> dto.getRace().getDateStart(), Comparator.reverseOrder()))
                .toList();
    }

    /**
     * Sums the statistics of duplicate teams based on their names in the provided
     * list of TeamInfoDTO objects.
     * 
     * @param teamsInfoDTO a list of TeamInfoDTO objects containing team statistics
     * @return a list of TeamInfoDTO objects with duplicate teams' statistics summed
     */
    public List<TeamInfoDTO> sumDuplicates(List<TeamInfoDTO> teamsInfoDTO) {
        Map<String, TeamInfoDTO> resultMap = new LinkedHashMap<>();

        for (TeamInfoDTO teamInfo : teamsInfoDTO) {
            String teamName = teamInfo.getTeam().getName();

            resultMap.merge(teamName, teamInfo, (existingTeamInfo, newTeamInfo) -> {
                existingTeamInfo.setTeam(newTeamInfo.getTeam());
                existingTeamInfo.setPoles(existingTeamInfo.getPoles() + newTeamInfo.getPoles());
                existingTeamInfo.setFastlaps(existingTeamInfo.getFastlaps() + newTeamInfo.getFastlaps());
                existingTeamInfo.setRacesFinished(existingTeamInfo.getRacesFinished() + newTeamInfo.getRacesFinished());
                existingTeamInfo.setTotalPoints(existingTeamInfo.getTotalPoints() + newTeamInfo.getTotalPoints());
                existingTeamInfo.setConstructors(existingTeamInfo.getConstructors() + newTeamInfo.getConstructors());
                existingTeamInfo.setPenalties(existingTeamInfo.getPenalties() + newTeamInfo.getPenalties());
                existingTeamInfo
                        .setBestPosition(Math.min(existingTeamInfo.getBestPosition(), newTeamInfo.getBestPosition()));
                existingTeamInfo.setVictories(existingTeamInfo.getVictories() + newTeamInfo.getVictories());
                existingTeamInfo.setPodiums(existingTeamInfo.getPodiums() + newTeamInfo.getPodiums());

                return existingTeamInfo;
            });
        }

        return new ArrayList<>(resultMap.values());
    }

    /**
     * Calcula los cambios de posición de cada equipo en el ranking general tras una
     * carrera específica.
     *
     * @param currentTeamRanking la lista actual de equipos con sus pilotos.
     * @param raceId             el ID de la carrera.
     */
    public void getOverallTeamPositionChanges(List<TeamWithDriversDTO> currentTeamRanking, int raceId) {
        List<Result> lastResults = resultRepository.findByRaceId(raceId);
        List<Sprint> lastSprints = sprintRepository.findByRaceId(raceId);

        Map<Long, Integer> pointsToReduce = new HashMap<>();
        lastResults.forEach(result -> {
            Long teamId = result.getDriver().getTeam().getId();
            int points = result.getPosition() != null ? result.getPosition().getPoints() : 0;
            points += result.getFastlap();
            pointsToReduce.merge(teamId, points, Integer::sum);
        });

        lastSprints.forEach(sprint -> {
            Long teamId = sprint.getDriver().getTeam().getId();
            int points = sprint.getPosition() != null ? sprint.getPosition().getPoints() : 0;
            pointsToReduce.merge(teamId, points, Integer::sum);
        });

        List<TeamWithDriversDTO> previousRanking = currentTeamRanking.stream()
                .map(team -> new TeamWithDriversDTO(
                        team.getTeam(),
                        team.getDriver1(),
                        team.getDriver2(),
                        team.getTotalPoints() - pointsToReduce.getOrDefault(team.getTeam().getId(), 0),
                        PositionChange.SAME,
                        0))
                .sorted(Comparator.comparingInt(TeamWithDriversDTO::getTotalPoints).reversed())
                .toList();

        Map<Long, Integer> previousPositions = new HashMap<>();
        for (int i = 0; i < previousRanking.size(); i++) {
            previousPositions.put(previousRanking.get(i).getTeam().getId(), i);
        }

        for (int i = 0; i < currentTeamRanking.size(); i++) {
            TeamWithDriversDTO team = currentTeamRanking.get(i);
            int previousPosition = previousPositions.getOrDefault(team.getTeam().getId(), i);
            int changeAmount = Math.abs(previousPosition - i);

            if (i < previousPosition) {
                team.setPositionChange(PositionChange.ADVANCED);
            } else if (i > previousPosition) {
                team.setPositionChange(PositionChange.DROPPED);
            } else {
                team.setPositionChange(PositionChange.SAME);
            }

            team.setPositionChangeAmount(changeAmount);
        }
    }

    /**
     * Get points' evolutions of teams
     *
     * @return a list of TeamPointsEvolutionDTO objects with the points' evolution
     *         of teams
     */
    public List<TeamPointsEvolutionDTO> getAllPointsEvolutionTeam(Set<Integer> teamIds) {
        List<Long> teamIdList = teamIds.stream()
                .map(Integer::longValue)
                .toList();

        List<Result> results = resultRepository.findByTeamIds(teamIdList);
        List<Sprint> sprints = sprintRepository.findByTeamIds(teamIdList);

        Map<Team, Map<Race, Integer>> teamRacePoints = new HashMap<>();

        for (Result result : results) {
            if (result.getDriver().getTeam() == null || result.getRace() == null)
                continue;

            Team team = result.getDriver().getTeam();
            Race race = result.getRace();
            int points = calculatePoints(result);

            teamRacePoints
                    .computeIfAbsent(team, t -> new HashMap<>())
                    .merge(race, points, Integer::sum);
        }

        for (Sprint sprint : sprints) {
            if (sprint.getDriver().getTeam() == null || sprint.getRace() == null)
                continue;

            Team team = sprint.getDriver().getTeam();
            Race race = sprint.getRace();
            int points = sprint.getPosition() != null ? sprint.getPosition().getPoints() : 0;

            teamRacePoints
                    .computeIfAbsent(team, t -> new HashMap<>())
                    .merge(race, points, Integer::sum);
        }

        List<TeamPointsEvolutionDTO> teamPointsList = new ArrayList<>();

        for (Map.Entry<Team, Map<Race, Integer>> entry : teamRacePoints.entrySet()) {
            Team team = entry.getKey();
            Map<Race, Integer> racePointsMap = entry.getValue();

            List<Map.Entry<Race, Integer>> sortedEntries = racePointsMap.entrySet().stream()
                    .sorted(Comparator.comparing(e -> e.getKey().getDateStart()))
                    .toList();

            int total = 0;
            List<Integer> accumulatedPoints = new ArrayList<>();
            List<RaceDTO> races = new ArrayList<>();

            for (Map.Entry<Race, Integer> rp : sortedEntries) {
                total += rp.getValue();
                accumulatedPoints.add(total);
                races.add(raceImpl.raceToRaceDTO(rp.getKey()));
            }

            TeamDTO teamDTO = teamImpl.teamToTeamDTO(team);
            teamPointsList.add(new TeamPointsEvolutionDTO(teamDTO, accumulatedPoints, races));
        }

        return teamPointsList;
    }

    private int calculatePoints(Result result) {
        int basePoints = 0;

        if (result.getPosition() != null) {
            basePoints = result.getPosition().getPoints();
        }

        if (result.getFastlap() == 1) {
            basePoints += 1;
        }

        return basePoints;
    }
}
