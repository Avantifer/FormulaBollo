package formula.bollo.service;

import org.springframework.cache.annotation.Cacheable;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.IntSummaryStatistics;
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
import formula.bollo.impl.DriverImpl;
import formula.bollo.impl.RaceImpl;
import formula.bollo.impl.ResultImpl;
import formula.bollo.impl.SeasonImpl;
import formula.bollo.impl.TeamImpl;
import formula.bollo.model.DriverDTO;
import formula.bollo.model.DriverInfoDTO;
import formula.bollo.model.DriverPointsDTO;
import formula.bollo.model.DriverPointsEvolutionDTO;
import formula.bollo.model.RaceDTO;
import formula.bollo.model.RecordDTO;
import formula.bollo.model.ResultDTO;
import formula.bollo.repository.*;
import formula.bollo.utils.Constants;
import formula.bollo.utils.StatsMerge;

@Service
public class DriverService {

    private ResultRepository resultRepository;
    private ChampionshipRepository championshipRepository;
    private PenaltyRepository penaltyRepository;
    private SprintRepository sprintRepository;

    private DriverImpl driverImpl;
    private TeamImpl teamImpl;
    private ResultImpl resultImpl;
    private SeasonImpl seasonImpl;
    private RaceImpl raceImpl;

    private ResultService resultService;

    public DriverService(
            ResultRepository resultRepository,
            ChampionshipRepository championshipRepository,
            PenaltyRepository penaltyRepository,
            SprintRepository sprintRepository,
            DriverImpl driverImpl,
            TeamImpl teamImpl,
            ResultImpl resultImpl,
            SeasonImpl seasonImpl,
            RaceImpl raceImpl,
            ResultService resultService) {
        this.resultRepository = resultRepository;
        this.championshipRepository = championshipRepository;
        this.penaltyRepository = penaltyRepository;
        this.sprintRepository = sprintRepository;
        this.driverImpl = driverImpl;
        this.teamImpl = teamImpl;
        this.resultImpl = resultImpl;
        this.seasonImpl = seasonImpl;
        this.raceImpl = raceImpl;
        this.resultService = resultService;
    }

    /**
     * Retrieves all type of info by the driver name
     *
     * @param drivers list of the drivers with the name filter
     */
    public DriverInfoDTO getAllInfoDriver(List<Driver> drivers) {
        if (drivers.isEmpty())
            return null;

        List<Long> listOfIds = drivers.stream().map(Driver::getId).toList();
        return buildInfo(drivers,
                this.resultRepository.findWithRaceAndPositionByDriverIds(listOfIds),
                this.sprintRepository.findByDriverIds(listOfIds),
                this.penaltyRepository.findByDriverIds(listOfIds),
                this.championshipRepository.findByDriverIds(listOfIds));
    }

    /**
     * Misma información que {@link #getAllInfoDriver(List)} para cada piloto de la lista, pero
     * cargando resultados, sprints, sanciones y campeonatos en 4 consultas en total.
     */
    public List<DriverInfoDTO> getAllInfoDrivers(List<Driver> drivers) {
        if (drivers.isEmpty())
            return List.of();

        List<Long> ids = drivers.stream().map(Driver::getId).toList();
        Map<Long, List<Result>> results = this.resultRepository.findWithRaceAndPositionByDriverIds(ids).stream()
                .collect(Collectors.groupingBy(result -> result.getDriver().getId()));
        Map<Long, List<Sprint>> sprints = this.sprintRepository.findByDriverIds(ids).stream()
                .collect(Collectors.groupingBy(sprint -> sprint.getDriver().getId()));
        Map<Long, Integer> penalties = toCounts(this.penaltyRepository.countByDriver(ids));
        Map<Long, Integer> championships = toCounts(this.championshipRepository.countByDriver(ids));

        return drivers.stream()
                .map(driver -> buildInfo(List.of(driver),
                        results.getOrDefault(driver.getId(), List.of()),
                        sprints.getOrDefault(driver.getId(), List.of()),
                        penalties.getOrDefault(driver.getId(), 0),
                        championships.getOrDefault(driver.getId(), 0)))
                .toList();
    }

    /** Uses the same aggregate calculation as getAllInfoDriver, once for each team. */
    Map<Long, DriverInfoDTO> getAllInfoDriversByTeam(List<Driver> drivers, List<Result> results) {
        if (drivers.isEmpty())
            return Map.of();

        List<Long> ids = drivers.stream().map(Driver::getId).toList();
        Map<Long, List<Driver>> driversByTeam = drivers.stream()
                .collect(Collectors.groupingBy(driver -> driver.getTeam().getId()));
        Map<Long, List<Result>> resultsByTeam = results.stream()
                .collect(Collectors.groupingBy(result -> result.getDriver().getTeam().getId()));
        Map<Long, List<Sprint>> sprintsByTeam = this.sprintRepository.findWithPositionByDriverIds(ids).stream()
                .collect(Collectors.groupingBy(sprint -> sprint.getDriver().getTeam().getId()));
        Map<Long, Integer> penalties = toCounts(this.penaltyRepository.countByDriver(ids));
        Map<Long, Integer> championships = toCounts(this.championshipRepository.countByDriver(ids));

        Map<Long, DriverInfoDTO> infoByTeam = new HashMap<>();
        driversByTeam.forEach((teamId, teamDrivers) -> infoByTeam.put(teamId,
                buildInfo(teamDrivers, resultsByTeam.getOrDefault(teamId, List.of()),
                        sprintsByTeam.getOrDefault(teamId, List.of()),
                        teamDrivers.stream().mapToInt(driver -> penalties.getOrDefault(driver.getId(), 0)).sum(),
                        teamDrivers.stream().mapToInt(driver -> championships.getOrDefault(driver.getId(), 0)).sum())));
        return infoByTeam;
    }

    private static Map<Long, Integer> toCounts(List<Object[]> rows) {
        Map<Long, Integer> counts = new HashMap<>();
        rows.forEach(row -> counts.put(((Number) row[0]).longValue(), ((Number) row[1]).intValue()));
        return counts;
    }

    private DriverInfoDTO buildInfo(List<Driver> drivers, List<Result> results, List<Sprint> sprints,
            int penalties, int championships) {
        List<Driver> driverList = drivers.stream()
                .filter(driverFilter -> driverFilter.getSeason().getNumber() == Constants.ACTUAL_SEASON)
                .toList();
        Driver driver = driverList.isEmpty() ? drivers.get(drivers.size() - 1) : driverList.get(0);

        List<Result> finished = results.stream().filter(result -> result.getPosition() != null).toList();
        IntSummaryStatistics positions = finished.stream()
                .mapToInt(result -> result.getPosition().getPositionNumber()).summaryStatistics();

        int poles = (int) results.stream().filter(result -> result.getPole() == 1).count();
        int fastlaps = (int) results.stream().filter(result -> result.getFastlap() == 1).count();
        int podiums = (int) finished.stream().filter(result -> result.getPosition().getPositionNumber() <= 3).count();
        int victories = (int) finished.stream().filter(result -> result.getPosition().getPositionNumber() == 1).count();
        int bestPosition = finished.isEmpty() ? 0 : positions.getMin();
        // La base devolvía AVG con 4 decimales; se mantiene el mismo formato.
        double averagePosition = Math.round(positions.getAverage() * 10000d) / 10000d;

        List<Result> last5 = finished.stream()
                .sorted(Comparator.comparing((Result result) -> result.getRace().getDateStart())
                        .thenComparing(Result::getId).reversed())
                .limit(5)
                .toList();

        return new DriverInfoDTO(
                driverImpl.driverToDriverDTO(driver), poles, fastlaps,
                finished.size(), resultService.sumPoints(results, sprints), championships,
                penalties, bestPosition, victories,
                podiums, averagePosition, this.resultImpl.convertResultsToResultsDTO(last5));
    }

    /**
     * Sums the statistics of duplicate drivers based on their names in the provided
     * list of DriverInfoDTO objects.
     * 
     * @param driversInfoDTO a list of DriverInfoDTO objects containing driver
     *                       statistics
     * @return a list of DriverInfoDTO objects with duplicate drivers' statistics
     *         summed
     */
    public List<DriverInfoDTO> sumDuplicates(List<DriverInfoDTO> driversInfoDTO) {
        Map<String, DriverInfoDTO> resultMap = new LinkedHashMap<>();

        for (DriverInfoDTO driverInfo : driversInfoDTO) {
            String driverName = driverInfo.getDriver().getName();

            resultMap.merge(driverName, driverInfo, (existing, incoming) -> {
                int existingSeason = existing.getDriver().getSeason().getNumber();
                int incomingSeason = incoming.getDriver().getSeason().getNumber();
                boolean useIncomingDriver = incomingSeason > existingSeason ||
                        (incomingSeason == existingSeason && incoming.getTotalPoints() > existing.getTotalPoints());
                // La media y las últimas carreras se calculan antes de sumar los contadores.
                existing.setAveragePosition(StatsMerge.weightedAverage(existing.getAveragePosition(),
                        existing.getRacesFinished(), incoming.getAveragePosition(), incoming.getRacesFinished()));
                existing.setLast5Results(latestResults(existing.getLast5Results(), incoming.getLast5Results()));
                existing.setPoles(existing.getPoles() + incoming.getPoles());
                existing.setFastlaps(existing.getFastlaps() + incoming.getFastlaps());
                existing.setRacesFinished(existing.getRacesFinished() + incoming.getRacesFinished());
                existing.setTotalPoints(existing.getTotalPoints() + incoming.getTotalPoints());
                existing.setChampionships(existing.getChampionships() + incoming.getChampionships());
                existing.setPenalties(existing.getPenalties() + incoming.getPenalties());
                existing.setBestPosition(StatsMerge.bestPosition(existing.getBestPosition(), incoming.getBestPosition()));
                existing.setVictories(existing.getVictories() + incoming.getVictories());
                existing.setPodiums(existing.getPodiums() + incoming.getPodiums());

                if (useIncomingDriver) {
                    existing.setDriver(incoming.getDriver());
                }

                return existing;
            });
        }

        return new ArrayList<>(resultMap.values());
    }

    /** Las 5 carreras más recientes de la unión de dos listas (fecha de carrera y luego id, de más a menos reciente). */
    private static List<ResultDTO> latestResults(List<ResultDTO> first, List<ResultDTO> second) {
        List<ResultDTO> all = new ArrayList<>();
        if (first != null)
            all.addAll(first);
        if (second != null)
            all.addAll(second);
        return all.stream()
                .sorted(Comparator.comparing((ResultDTO result) -> result.getRace().getDateStart())
                        .thenComparing(ResultDTO::getId).reversed())
                .limit(5)
                .toList();
    }

    /**
     * Get all records of drivers.
     * 
     * @return a list of RecordDTO objects with the records statistics
     */
    @Cacheable(cacheNames = Constants.CACHE_STATS, sync = true, key = "#root.methodName + T(java.util.Arrays).toString(#root.args)")
    public List<RecordDTO> getAllRecords() {
        List<RecordDTO> recordDTOs = new ArrayList<>();
        this.resultRepository.recordPoleDriver().stream().findFirst().ifPresent(recordDTOs::add);
        this.resultRepository.recordPodiumsDriver().stream().findFirst().ifPresent(recordDTOs::add);
        this.resultRepository.recordFastlapDriver().stream().findFirst().ifPresent(recordDTOs::add);
        this.resultRepository.recordVictoriesDriver().stream().findFirst().ifPresent(recordDTOs::add);
        this.resultRepository.recordPorcentageVictoriesDriver().stream().findFirst().ifPresent(recordDTOs::add);
        this.penaltyRepository.recordPenaltiesDriver().stream().findFirst().ifPresent(recordDTOs::add);
        this.resultRepository.recordRacesFinishedDriver().stream().findFirst().ifPresent(recordDTOs::add);
        this.resultService.getTotalResultsPerDriver(0, null).stream().findFirst().ifPresent(resultDTO ->
                recordDTOs.add(new RecordDTO(
                "Mayor número de puntos en una temporada",
                resultDTO.getTotalPoints(),
                this.driverImpl.driverDTOToDriver(resultDTO.getDriver()),
                this.teamImpl.teamDTOToTeam(resultDTO.getDriver().getTeam()),
                this.seasonImpl.seasonDTOToSeason(resultDTO.getDriver().getSeason()))));

        return recordDTOs;
    }

    /**
     * Get points' evolutions of driver
     * 
     * @return a list of DriverPointsEvolutionDTO objects with the points' evolution
     *         of driver
     */
    @Cacheable(cacheNames = Constants.CACHE_STATS, sync = true, key = "#root.methodName + T(java.util.Arrays).toString(#root.args)")
    public List<DriverPointsEvolutionDTO> getAllPointsEvolutionDriver(Set<Integer> driverIds) {
        List<Long> driverIdList = driverIds.stream()
                .map(Integer::longValue)
                .toList();

        List<Result> results = resultRepository.findByDriverIds(driverIdList);
        List<Sprint> sprints = sprintRepository.findByDriverIds(driverIdList);

        Map<Long, List<Result>> groupedResults = results.stream()
                .collect(Collectors.groupingBy(result -> result.getDriver().getId()));
        Map<Long, List<Sprint>> groupedSprints = sprints.stream()
                .collect(Collectors.groupingBy(sprint -> sprint.getDriver().getId()));

        List<DriverPointsEvolutionDTO> driverPointsList = new ArrayList<>();

        Map<Long, Driver> allDrivers = new HashMap<>();
        results.forEach(result -> allDrivers.putIfAbsent(result.getDriver().getId(), result.getDriver()));
        sprints.forEach(sprint -> allDrivers.putIfAbsent(sprint.getDriver().getId(), sprint.getDriver()));

        for (Driver driver : allDrivers.values()) {
            DriverDTO driverDTO = driverImpl.driverToDriverDTO(driver);
            Map<Long, Integer> pointsByRace = new HashMap<>();
            Map<Long, Race> raceById = new HashMap<>();

            for (Result result : groupedResults.getOrDefault(driver.getId(), List.of())) {
                int points = calculatePoints(result);
                pointsByRace.merge(result.getRace().getId(), points, Integer::sum);
                raceById.put(result.getRace().getId(), result.getRace());
            }

            for (Sprint sprint : groupedSprints.getOrDefault(driver.getId(), List.of())) {
                int points = sprint.getPosition() != null ? sprint.getPosition().getPoints() : 0;
                pointsByRace.merge(sprint.getRace().getId(), points, Integer::sum);
                raceById.put(sprint.getRace().getId(), sprint.getRace());
            }

            List<Race> sortedRaces = raceById.values().stream()
                    .sorted(Comparator.comparing(Race::getDateStart).thenComparing(Race::getId)).toList();

            int total = 0;
            List<Integer> accumulated = new ArrayList<>();
            List<RaceDTO> races = new ArrayList<>();
            for (Race race : sortedRaces) {
                total += pointsByRace.get(race.getId());
                accumulated.add(total);
                races.add(raceImpl.raceToRaceDTO(race));
            }

            driverPointsList.add(new DriverPointsEvolutionDTO(driverDTO, accumulated, races));
        }

        return driverPointsList;
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
