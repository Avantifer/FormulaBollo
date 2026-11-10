package formula.bollo.service;

import org.springframework.cache.annotation.Cacheable;

import java.util.AbstractMap;
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
                existing.setPoles(existing.getPoles() + incoming.getPoles());
                existing.setFastlaps(existing.getFastlaps() + incoming.getFastlaps());
                existing.setRacesFinished(existing.getRacesFinished() + incoming.getRacesFinished());
                existing.setTotalPoints(existing.getTotalPoints() + incoming.getTotalPoints());
                existing.setChampionships(existing.getChampionships() + incoming.getChampionships());
                existing.setPenalties(existing.getPenalties() + incoming.getPenalties());
                existing.setBestPosition(Math.max(existing.getBestPosition(), incoming.getBestPosition()));
                existing.setVictories(existing.getVictories() + incoming.getVictories());
                existing.setPodiums(existing.getPodiums() + incoming.getPodiums());

                int existingSeason = existing.getDriver().getSeason().getNumber();
                int incomingSeason = incoming.getDriver().getSeason().getNumber();

                if (incomingSeason > existingSeason ||
                        (incomingSeason == existingSeason && incoming.getTotalPoints() > existing.getTotalPoints())) {
                    existing.setDriver(incoming.getDriver());
                }

                return existing;
            });
        }

        return new ArrayList<>(resultMap.values());
    }

    /**
     * Get all records of drivers.
     * 
     * @return a list of RecordDTO objects with the records statistics
     */
    @Cacheable(cacheNames = Constants.CACHE_STATS, key = "#root.methodName + T(java.util.Arrays).toString(#root.args)")
    public List<RecordDTO> getAllRecords() {
        List<RecordDTO> recordDTOs = new ArrayList<>();
        RecordDTO recordPole = this.resultRepository.recordPoleDriver().getFirst();
        RecordDTO recordPodiums = this.resultRepository.recordPodiumsDriver().getFirst();
        RecordDTO recordFastLap = this.resultRepository.recordFastlapDriver().getFirst();
        RecordDTO recordVictories = this.resultRepository.recordVictoriesDriver().getFirst();
        RecordDTO recordPorcentageVictories = this.resultRepository.recordPorcentageVictoriesDriver()
                .getFirst();
        RecordDTO recordPenalties = this.penaltyRepository.recordPenaltiesDriver().getFirst();
        RecordDTO recordRacesFinished = this.resultRepository.recordRacesFinishedDriver().getFirst();
        DriverPointsDTO resultDTO = this.resultService.getTotalResultsPerDriver(0, null).getFirst();
        RecordDTO recordPoints = new RecordDTO(
                "Mayor número de puntos en una temporada",
                resultDTO.getTotalPoints(),
                this.driverImpl.driverDTOToDriver(resultDTO.getDriver()),
                this.teamImpl.teamDTOToTeam(resultDTO.getDriver().getTeam()),
                this.seasonImpl.seasonDTOToSeason(resultDTO.getDriver().getSeason()));

        recordDTOs.add(recordPole);
        recordDTOs.add(recordPodiums);
        recordDTOs.add(recordFastLap);
        recordDTOs.add(recordVictories);
        recordDTOs.add(recordPorcentageVictories);
        recordDTOs.add(recordPenalties);
        recordDTOs.add(recordRacesFinished);
        recordDTOs.add(recordPoints);

        return recordDTOs;
    }

    /**
     * Get points' evolutions of driver
     * 
     * @return a list of DriverPointsEvolutionDTO objects with the points' evolution
     *         of driver
     */
    @Cacheable(cacheNames = Constants.CACHE_STATS, key = "#root.methodName + T(java.util.Arrays).toString(#root.args)")
    public List<DriverPointsEvolutionDTO> getAllPointsEvolutionDriver(Set<Integer> driverIds) {
        List<Long> driverIdList = driverIds.stream()
                .map(Integer::longValue)
                .toList();

        List<Result> results = resultRepository.findByDriverIds(driverIdList);
        List<Sprint> sprints = sprintRepository.findByDriverIds(driverIdList);

        Map<Driver, List<Result>> groupedResults = results.stream()
                .collect(Collectors.groupingBy(Result::getDriver));
        Map<Driver, List<Sprint>> groupedSprints = sprints.stream()
                .collect(Collectors.groupingBy(Sprint::getDriver));

        List<DriverPointsEvolutionDTO> driverPointsList = new ArrayList<>();

        Set<Driver> allDrivers = new HashSet<>();
        allDrivers.addAll(groupedResults.keySet());
        allDrivers.addAll(groupedSprints.keySet());

        for (Driver driver : allDrivers) {
            DriverDTO driverDTO = driverImpl.driverToDriverDTO(driver);
            List<Map.Entry<Race, Integer>> allEntries = new ArrayList<>();

            for (Result result : groupedResults.getOrDefault(driver, List.of())) {
                int points = calculatePoints(result);
                allEntries.add(new AbstractMap.SimpleEntry<>(result.getRace(), points));
            }

            for (Sprint sprint : groupedSprints.getOrDefault(driver, List.of())) {
                int points = sprint.getPosition() != null ? sprint.getPosition().getPoints() : 0;
                allEntries.add(new AbstractMap.SimpleEntry<>(sprint.getRace(), points));
            }

            allEntries.sort(Comparator.comparing(entry -> entry.getKey().getDateStart()));

            int total = 0;
            List<Integer> accumulated = new ArrayList<>();
            List<RaceDTO> races = new ArrayList<>();
            Set<Long> addedRaceIds = new HashSet<>();

            for (Map.Entry<Race, Integer> entry : allEntries) {
                total += entry.getValue();

                if (addedRaceIds.add(entry.getKey().getId())) {
                    accumulated.add(total);
                    races.add(raceImpl.raceToRaceDTO(entry.getKey()));
                }
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
