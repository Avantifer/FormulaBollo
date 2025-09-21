package formula.bollo.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import formula.bollo.entity.Result;
import formula.bollo.entity.Sprint;
import formula.bollo.enums.PositionChange;
import formula.bollo.impl.DriverImpl;
import formula.bollo.impl.ResultImpl;
import formula.bollo.model.DriverDTO;
import formula.bollo.model.DriverPointsDTO;
import formula.bollo.model.ResultDTO;
import formula.bollo.model.ResultTeamDTO;
import formula.bollo.model.TeamDTO;
import formula.bollo.repository.ResultRepository;
import formula.bollo.repository.SprintRepository;
import formula.bollo.utils.Constants;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class ResultService {

    private ResultRepository resultRepository;
    private SprintRepository sprintRepository;

    private ResultImpl resultImpl;
    private DriverImpl driverImpl;

    public ResultService(
            ResultRepository resultRepository,
            SprintRepository sprintRepository,
            ResultImpl resultImpl,
            DriverImpl driverImpl) {
        this.resultRepository = resultRepository;
        this.sprintRepository = sprintRepository;
        this.resultImpl = resultImpl;
        this.driverImpl = driverImpl;
    }

    /**
     * Calculates the total points for each driver based on race results and
     * sprints.
     * 
     * @param results             The list of race results for the season.
     * @param sprints             The list of sprint results for the season. Can be
     *                            empty.
     * @param totalPointsByDriver A map where the key is the DriverDTO, and the
     *                            value is the total points for that driver.
     * @return A sorted list of DriverPointsDTO objects, representing the total
     *         points per driver in descending order.
     */
    public List<DriverPointsDTO> setTotalPointsByDriver(List<Result> results, List<Sprint> sprints,
            Map<DriverDTO, Integer> totalPointsByDriver) {

        setTotalResultPointsByDriver(results, totalPointsByDriver);

        if (!sprints.isEmpty()) {
            setTotalSprintsPointsByDriver(sprints, totalPointsByDriver);
        }

        return reOrderDriverPoints(totalPointsByDriver, results);
    }

    /**
     * Reorder all points in the case that the same pilot races for more than one
     * team
     * 
     * @param totalPointsByDriver A map where the key is the DriverDTO, and the
     *                            value is the total points for that driver.
     * @return A sorted list of DriverPointsDTO objects, representing the total
     *         points per driver in descending order.
     */
    private List<DriverPointsDTO> reOrderDriverPoints(Map<DriverDTO, Integer> totalPointsByDriver,
            List<Result> results) {

        Map<String, DriverPointsDTO> mergedDrivers = new HashMap<>();

        for (Map.Entry<DriverDTO, Integer> entry : totalPointsByDriver.entrySet()) {
            DriverDTO currentDriver = entry.getKey();
            int points = entry.getValue();

            String uniqueKey = currentDriver.getName() + "_" + currentDriver.getSeason().getId();

            if (mergedDrivers.containsKey(uniqueKey)) {
                DriverPointsDTO existing = mergedDrivers.get(uniqueKey);
                existing.setTotalPoints(existing.getTotalPoints() + points);
                existing.setDriver(currentDriver);
            } else {
                mergedDrivers.put(uniqueKey, new DriverPointsDTO(currentDriver, points));
            }
        }

        List<DriverPointsDTO> driverPointsDTOs = mergedDrivers.values().stream()
                .sorted(Comparator.comparingInt(DriverPointsDTO::getTotalPoints).reversed())
                .toList();

        this.getOverallPositionChanges(driverPointsDTOs, results.getLast().getRace().getId().intValue());

        return driverPointsDTOs;
    }

    /**
     * Retrieves the total results per driver for the current season.
     *
     * @param numResults The optional number of drivers to return. If null, all
     *                   drivers will be returned.
     * @return A list of DriverPointsDTO objects, representing each driver's total
     *         points for the season.
     */
    public List<DriverPointsDTO> getTotalResultsPerDriver(Integer seasonNumber, Integer numResults) {
        List<Result> results;

        if (seasonNumber == 0) {
            results = resultRepository.findAll();
        } else {
            results = resultRepository.findBySeason(seasonNumber);
        }

        if (results.isEmpty())
            return new ArrayList<>();

        Map<DriverDTO, Integer> totalPointsByDriver = new HashMap<>();
        List<Sprint> sprints;

        if (seasonNumber == 0) {
            sprints = sprintRepository.findAll();
        } else {
            sprints = sprintRepository.findBySeason(seasonNumber);
        }

        List<DriverPointsDTO> driverPointsDTOList = this.setTotalPointsByDriver(results, sprints, totalPointsByDriver);

        if (numResults != null && numResults < driverPointsDTOList.size()) {
            return driverPointsDTOList.subList(0, numResults);
        }

        return driverPointsDTOList;
    }

    /**
     * Retrieves the total results per driver for the current season.
     *
     * @param seasonNumber The number of the season. If not season selected is 0.
     * @param ids          The ids of the drivers.
     * @return A list of DriverPointsDTO objects, representing each driver's total
     *         points for the season.
     */
    public List<DriverPointsDTO> getTotalResultsSpecificPerDriver(Integer seasonNumber, List<Long> ids) {
        List<Result> results;
        List<Sprint> sprints;

        if (seasonNumber == 0) {
            results = resultRepository.findByDriverIds(ids);
            sprints = sprintRepository.findByDriverIds(ids);
        } else {
            results = resultRepository.findBySeasonAndDrivers(seasonNumber, ids);
            sprints = sprintRepository.findBySeasonAndDrivers(seasonNumber, ids);
        }

        if (results.isEmpty())
            return new ArrayList<>();

        Map<DriverDTO, Integer> totalPointsByDriver = new HashMap<>();
        List<DriverPointsDTO> drivers = this.setTotalPointsByDriver(results, sprints, totalPointsByDriver);

        Map<String, DriverPointsDTO> mergedMap = new HashMap<>();

        for (DriverPointsDTO driverDTO : drivers) {
            String name = driverDTO.getDriver().getName();
            int points = driverDTO.getTotalPoints();

            if (mergedMap.containsKey(name)) {
                DriverPointsDTO existing = mergedMap.get(name);
                existing.setTotalPoints(existing.getTotalPoints() + points);
            } else {
                DriverPointsDTO copy = new DriverPointsDTO(driverDTO.getDriver(), points);
                mergedMap.put(name, copy);
            }
        }

        List<DriverPointsDTO> driversFinal = new ArrayList<>(mergedMap.values());
        driversFinal.sort(Comparator.comparingInt(DriverPointsDTO::getTotalPoints).reversed());

        return driversFinal;
    }

    /**
     * Calculates and sets total points for race results by driver.
     *
     * @param results             The list of race results.
     * @param totalPointsByDriver A map to store total points by driver.
     */
    private void setTotalResultPointsByDriver(List<Result> results, Map<DriverDTO, Integer> totalPointsByDriver) {
        results.stream().forEach((Result result) -> {
            DriverDTO driverDTO = driverImpl.driverToDriverDTO(result.getDriver());
            int points = 0;
            int fastlap = result.getFastlap();

            if (result.getPosition() != null) {
                points = result.getPosition().getPoints();
                points += fastlap;
            }

            addPointsToDriver(driverDTO, points, totalPointsByDriver);
        });
    }

    /**
     * Calculates and sets total points for sprint results by driver.
     *
     * @param sprints             The list of sprint results.
     * @param totalPointsByDriver A map to store total points by driver.
     */
    private void setTotalSprintsPointsByDriver(List<Sprint> sprints, Map<DriverDTO, Integer> totalPointsByDriver) {
        sprints.stream().forEach((Sprint sprint) -> {
            DriverDTO driverDTO = driverImpl.driverToDriverDTO(sprint.getDriver());
            int points = 0;

            if (sprint.getPosition() != null) {
                points = sprint.getPosition().getPoints();
            }

            addPointsToDriver(driverDTO, points, totalPointsByDriver);
        });
    }

    /**
     * Orders a list of ResultDTO objects by their positions (if available).
     *
     * @param resultDTOs The list of ResultDTO objects to be ordered.
     */
    public List<ResultDTO> orderResultsByPoints(List<ResultDTO> resultDTOs) {
        Comparator<ResultDTO> pointsComparator = Comparator
                .comparing(result -> result.getPosition() != null ? result.getPosition().getPositionNumber() : null,
                        Comparator.nullsLast(Integer::compareTo));
        Collections.sort(resultDTOs, pointsComparator);

        return resultDTOs;
    }

    /**
     * Orders a list of ResultDTO objects by their positions ordered by teams (if
     * available).
     *
     * @param resultDTOs The list of ResultDTO objects to be ordered.
     */
    public List<ResultTeamDTO> orderResultsByPointsByTeams(List<ResultDTO> resultDTOs) {
        Map<Long, ResultTeamDTO> teamPointsMap = new HashMap<>();

        for (ResultDTO result : resultDTOs) {
            int points = (result.getPosition() != null ? result.getPosition().getPoints() : 0) + result.getFastlap();
            TeamDTO team = result.getDriver().getTeam();

            ResultTeamDTO teamEntry = teamPointsMap.computeIfAbsent(team.getId(),
                    id -> new ResultTeamDTO(result.getRace(), new ArrayList<>(), 0, 0, 0));

            teamEntry.setTotalPoints(teamEntry.getTotalPoints() + points);
            teamEntry.setHasFastLap(teamEntry.getHasFastLap() + result.getFastlap());
            teamEntry.setHasPole(teamEntry.getHasPole() + result.getPole());
            teamEntry.getResults().add(result);
            teamEntry.getResults().sort(Comparator.comparing(
                    r -> r.getPosition() != null ? r.getPosition().getPositionNumber() : Integer.MAX_VALUE));
        }

        List<ResultTeamDTO> teamPointsList = new ArrayList<>(teamPointsMap.values());
        teamPointsList.sort(Comparator.comparingInt(ResultTeamDTO::getTotalPoints).reversed());

        return teamPointsList;
    }

    /**
     * Adds points to the specified driver in the totalPointsByDriver map.
     *
     * @param driverDTO           The DriverDTO object representing the driver.
     * @param points              The number of points to add to the driver.
     * @param totalPointsByDriver A map where the key is the DriverDTO, and the
     *                            value is the total points for that driver.
     */
    private void addPointsToDriver(DriverDTO driverDTO, int points, Map<DriverDTO, Integer> totalPointsByDriver) {
        totalPointsByDriver.merge(driverDTO, points, Integer::sum);
    }

    /**
     * Save results.
     *
     * @param resultDTOs The list of result to save.
     */
    public ResponseEntity<String> saveResults(List<ResultDTO> resultDTOs) {
        if (resultDTOs.isEmpty()) {
            log.error("Hubo un error al guardar los resultados por estan vacios");
            return new ResponseEntity<>("No hay resultados", Constants.HEADERS_TEXT_PLAIN, HttpStatusCode.valueOf(500));
        }

        List<Result> existingResults = this.resultRepository
                .findByRaceId(resultDTOs.get(0).getRace().getId().intValue());

        if (!existingResults.isEmpty()) {
            this.resultRepository.deleteAll(existingResults);
        }

        resultRepository.saveAll(this.resultImpl.convertResultsDTOToResults(resultDTOs));

        return new ResponseEntity<>("Resultados guardados correctamente", Constants.HEADERS_TEXT_PLAIN,
                HttpStatusCode.valueOf(200));
    }

    /**
     * Save results.
     *
     * @param resultDTOs The list of result to save.
     */
    public ResponseEntity<String> deleteResults(Integer raceId) {
        this.resultRepository.deleteByRaceId(raceId);

        return new ResponseEntity<>("Resultados borrados correctamente", Constants.HEADERS_TEXT_PLAIN,
                HttpStatusCode.valueOf(200));
    }

    /**
     * Calculate the difference position in the general clasification
     * 
     * @param driverPointsList the list of driversPoints.
     * @param raceId           last race id.
     */
    public void getOverallPositionChanges(List<DriverPointsDTO> driverPointsList, int raceId) {
        List<Result> lastResults = resultRepository.findByRaceId(raceId);
        List<Sprint> lastSprints = sprintRepository.findByRaceId(raceId);

        // 1. Calcular puntos a restar (agrupando por nombre + temporada)
        Map<String, Integer> pointsToReduce = new HashMap<>();

        lastResults.forEach(result -> {
            String driverName = result.getDriver().getName();
            Long seasonId = result.getDriver().getSeason().getId();
            String key = driverName + "_" + seasonId;
            int points = (result.getPosition() != null ? result.getPosition().getPoints() : 0) + result.getFastlap();
            pointsToReduce.merge(key, points, Integer::sum);
        });

        lastSprints.forEach(sprint -> {
            String driverName = sprint.getDriver().getName();
            Long seasonId = sprint.getDriver().getSeason().getId();
            String key = driverName + "_" + seasonId;
            int points = sprint.getPosition() != null ? sprint.getPosition().getPoints() : 0;
            pointsToReduce.merge(key, points, Integer::sum);
        });

        // 2. Crear clasificación anterior (usando nombre + temporada)
        List<DriverPointsDTO> lastPointsRace = driverPointsList.stream()
                .map(driverPoint -> {
                    String driverName = driverPoint.getDriver().getName();
                    Long seasonId = driverPoint.getDriver().getSeason().getId();
                    String key = driverName + "_" + seasonId;
                    int reducedPoints = driverPoint.getTotalPoints() - pointsToReduce.getOrDefault(key, 0);
                    return new DriverPointsDTO(driverPoint.getDriver(), reducedPoints);
                })
                .sorted(Comparator.comparingInt(DriverPointsDTO::getTotalPoints).reversed())
                .toList();

        // 3. Mapear posiciones anteriores por nombre + temporada
        Map<String, Integer> lastPositions = IntStream.range(0, lastPointsRace.size())
                .boxed()
                .collect(Collectors.toMap(
                        i -> {
                            DriverDTO driver = lastPointsRace.get(i).getDriver();
                            return driver.getName() + "_" + driver.getSeason().getId();
                        },
                        i -> i));

        // 4. Calcular cambios de posición (comparando por nombre + temporada)
        IntStream.range(0, driverPointsList.size())
                .forEach(i -> {
                    DriverPointsDTO driverPoint = driverPointsList.get(i);
                    DriverDTO driver = driverPoint.getDriver();
                    String key = driver.getName() + "_" + driver.getSeason().getId();
                    int previousPosition = lastPositions.getOrDefault(key, i);
                    int positionChangeAmount = Math.abs(previousPosition - i);

                    if (i < previousPosition) {
                        driverPoint.setPositionChange(PositionChange.ADVANCED);
                    } else if (i > previousPosition) {
                        driverPoint.setPositionChange(PositionChange.DROPPED);
                    } else {
                        driverPoint.setPositionChange(PositionChange.SAME);
                    }

                    driverPoint.setPositionChangeAmount(positionChangeAmount);
                });
    }
}
