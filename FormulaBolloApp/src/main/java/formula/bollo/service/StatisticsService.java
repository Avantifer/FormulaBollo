package formula.bollo.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import formula.bollo.entity.Driver;
import formula.bollo.entity.Penalty;
import formula.bollo.entity.Race;
import formula.bollo.entity.Result;
import formula.bollo.entity.Sprint;
import formula.bollo.entity.Team;
import formula.bollo.model.*;
import formula.bollo.repository.DriverRepository;
import formula.bollo.repository.PenaltyRepository;
import formula.bollo.repository.RaceRepository;
import formula.bollo.repository.ResultRepository;
import formula.bollo.repository.SprintRepository;
import formula.bollo.repository.TeamRepository;
import formula.bollo.utils.ResultPoints;

@Service
public class StatisticsService {
    private static final Comparator<Race> CHRONOLOGICAL = Comparator.comparing(Race::getDateStart)
            .thenComparing(Race::getId);

    private final DriverRepository driverRepository;
    private final TeamRepository teamRepository;
    private final RaceRepository raceRepository;
    private final ResultRepository resultRepository;
    private final SprintRepository sprintRepository;
    private final PenaltyRepository penaltyRepository;
    private final DriverService driverService;
    private final TeamService teamService;

    public StatisticsService(DriverRepository driverRepository, TeamRepository teamRepository,
            RaceRepository raceRepository, ResultRepository resultRepository, SprintRepository sprintRepository,
            PenaltyRepository penaltyRepository, DriverService driverService, TeamService teamService) {
        this.driverRepository = driverRepository;
        this.teamRepository = teamRepository;
        this.raceRepository = raceRepository;
        this.resultRepository = resultRepository;
        this.sprintRepository = sprintRepository;
        this.penaltyRepository = penaltyRepository;
        this.driverService = driverService;
        this.teamService = teamService;
    }

    public StatisticsOverviewDTO getOverview(int season) {
        int scope = Math.max(0, season);
        var drivers = driverRepository.findForStatistics(scope);
        var teams = teamRepository.findForStatistics(scope);
        List<Race> races = raceRepository.findForStatistics(scope).stream().sorted(CHRONOLOGICAL).toList();
        List<Result> original = resultRepository.findForStatistics(scope);
        List<Sprint> sprints = sprintRepository.findForStatistics(scope);
        List<Penalty> penalties = penaltyRepository.findForStatistics(scope);

        List<DriverInfoDTO> driverInfo = driverService.getAllInfoDrivers(drivers);
        List<TeamInfoDTO> teamInfo = teamService.getAllInfoTeams(teams);
        Map<String, Map<Integer, Integer>> driverSeasonPoints = pointsBySeason(driverInfo,
                info -> info.getDriver().getName(), info -> info.getDriver().getSeason().getNumber(),
                DriverInfoDTO::getTotalPoints);
        Map<String, Map<Integer, Integer>> teamSeasonPoints = pointsBySeason(teamInfo,
                info -> info.getTeam().getName(), info -> info.getTeam().getSeason().getNumber(),
                TeamInfoDTO::getTotalPoints);

        List<Result> rows = deduplicate(original);
        Map<String, List<Result>> byDriver = rows.stream()
                .collect(Collectors.groupingBy(row -> row.getDriver().getName()));
        Map<String, List<Result>> byTeam = rows.stream()
                .collect(Collectors.groupingBy(row -> row.getDriver().getTeam().getName()));
        Map<String, List<Penalty>> penaltiesByDriver = penalties.stream()
                .collect(Collectors.groupingBy(penalty -> penalty.getDriver().getName()));

        List<DriverStatsDTO> driverStats = driverService.sumDuplicates(driverInfo).stream().map(info -> {
            DriverStatsDTO dto = driverStats(info, byDriver.getOrDefault(info.getDriver().getName(), List.of()),
                    penaltiesByDriver.getOrDefault(info.getDriver().getName(), List.of()));
            dto.setPointsBySeason(driverSeasonPoints.get(info.getDriver().getName()));
            return dto;
        }).sorted(Comparator.comparingInt(DriverStatsDTO::getTotalPoints).reversed()
                .thenComparing(dto -> dto.getDriver().getName())).toList();
        Map<String, Integer> driverPoints = driverStats.stream().collect(Collectors.toMap(
                dto -> dto.getDriver().getName(), DriverStatsDTO::getTotalPoints));

        List<TeamInfoDTO> mergedTeams = teamService.sumDuplicates(teamInfo);
        int totalTeamPoints = mergedTeams.stream().mapToInt(TeamInfoDTO::getTotalPoints).sum();
        List<TeamStatsDTO> teamStats = mergedTeams.stream().map(info -> {
            TeamStatsDTO dto = teamStats(info, byTeam.getOrDefault(info.getTeam().getName(), List.of()),
                    driverPoints, totalTeamPoints);
            dto.setPointsBySeason(teamSeasonPoints.get(info.getTeam().getName()));
            return dto;
        }).sorted(Comparator.comparingInt(TeamStatsDTO::getTotalPoints).reversed()
                .thenComparing(dto -> dto.getTeam().getName())).toList();

        List<Race> finished = races.stream().filter(race -> race.getFinished() == 1).toList();
        List<StatisticsRaceDTO> axis = finished.stream()
                .map(race -> new StatisticsRaceDTO(race.getId(), race.getName(), race.getSeason().getNumber())).toList();
        Map<String, Map<Long, Integer>> driverRacePoints = racePoints(rows, sprints, false);
        Map<String, Map<Long, Integer>> teamRacePoints = racePoints(rows, sprints, true);
        var driverSeries = driverStats.stream()
                .map(dto -> new DriverStatisticsSeriesDTO(dto.getDriver(),
                        cumulative(finished, driverRacePoints.getOrDefault(dto.getDriver().getName(), Map.of()))))
                .toList();
        var teamSeries = teamStats.stream().filter(dto -> byTeam.containsKey(dto.getTeam().getName()))
                .map(dto -> new TeamStatisticsSeriesDTO(dto.getTeam(),
                        cumulative(finished, teamRacePoints.getOrDefault(dto.getTeam().getName(), Map.of()))))
                .toList();

        int poles = (int) rows.stream().filter(row -> row.getPole() == 1).count();
        int poleWins = driverStats.stream().mapToInt(DriverStatsDTO::getPoleWins).sum();
        int dnfs = (int) rows.stream().filter(row -> row.getPosition() == null).count();
        int winners = (int) rows.stream().filter(row -> position(row) == 1)
                .map(row -> row.getDriver().getName()).distinct().count();
        int margin = driverStats.size() < 2 ? 0
                : driverStats.get(0).getTotalPoints() - driverStats.get(1).getTotalPoints();
        StatisticsSummaryDTO summary = new StatisticsSummaryDTO(races.size(), finished.size(), winners,
                poles == 0 ? null : round(100d * poleWins / poles, 1),
                rows.isEmpty() ? 0 : round((double) dnfs / rows.size(), 3), margin);
        return new StatisticsOverviewDTO(season, summary, driverStats, teamStats,
                new StatisticsEvolutionDTO<>(axis, driverSeries), new StatisticsEvolutionDTO<>(axis, teamSeries));
    }

    public StatisticsRecordsDTO getRecords() {
        var drivers = driverRepository.findForStatistics(0).stream()
                .filter(driver -> !vacancy(driver.getName())).toList();
        List<Race> races = raceRepository.findForStatistics(0).stream().sorted(CHRONOLOGICAL).toList();
        List<Result> rows = deduplicate(resultRepository.findForStatistics(0).stream()
                .filter(row -> row.getRace().getFinished() == 1 && !vacancy(row.getDriver().getName())).toList());
        List<Sprint> sprints = sprintRepository.findForStatistics(0).stream()
                .filter(sprint -> sprint.getRace().getFinished() == 1 && !vacancy(sprint.getDriver().getName())).toList();
        List<Penalty> penalties = penaltyRepository.findForStatistics(0).stream()
                .filter(penalty -> !vacancy(penalty.getDriver().getName())).toList();

        Map<Integer, List<Race>> calendars = races.stream().collect(Collectors.groupingBy(
                race -> race.getSeason().getNumber(), TreeMap::new, Collectors.toList()));
        Map<DriverSeason, List<Driver>> driversBySeason = drivers.stream().collect(Collectors.groupingBy(
                driver -> new DriverSeason(driver.getName(), driver.getSeason().getNumber())));
        Map<DriverSeason, List<Result>> rowsByDriver = rows.stream().collect(Collectors.groupingBy(
                row -> new DriverSeason(row.getDriver().getName(), row.getRace().getSeason().getNumber())));
        Map<DriverSeason, List<Sprint>> sprintsByDriver = sprints.stream().collect(Collectors.groupingBy(
                sprint -> new DriverSeason(sprint.getDriver().getName(), sprint.getRace().getSeason().getNumber())));
        Map<DriverSeason, List<Penalty>> penaltiesByDriver = penalties.stream().collect(Collectors.groupingBy(
                penalty -> new DriverSeason(penalty.getDriver().getName(), penalty.getSeason().getNumber())));
        List<DriverStatsDTO> driverStats = driversBySeason.entrySet().stream().map(entry -> {
            List<Result> results = rowsByDriver.getOrDefault(entry.getKey(), List.of());
            Map<Long, Long> teamCounts = results.stream().collect(Collectors.groupingBy(
                    row -> row.getDriver().getTeam().getId(), Collectors.counting()));
            Driver representative = entry.getValue().stream().sorted(Comparator
                    .comparingLong((Driver driver) -> teamCounts.getOrDefault(driver.getTeam().getId(), 0L)).reversed()
                    .thenComparing(Driver::getId)).findFirst().orElseThrow();
            List<Penalty> sanctions = penaltiesByDriver.getOrDefault(entry.getKey(), List.of());
            DriverInfoDTO info = driverService.buildInfo(List.of(representative), results,
                    sprintsByDriver.getOrDefault(entry.getKey(), List.of()), sanctions.size(), 0);
            return driverStats(info, results, sanctions);
        }).sorted(Comparator.comparingInt(DriverStatsDTO::getTotalPoints).reversed()
                .thenComparing(dto -> dto.getDriver().getName())).toList();

        List<RecordSeasonDTO> seasons = calendars.entrySet().stream().map(entry -> {
            int number = entry.getKey();
            int finished = (int) entry.getValue().stream().filter(race -> race.getFinished() == 1).count();
            List<DriverStatsDTO> standings = driverStats.stream()
                    .filter(dto -> dto.getDriver().getSeason().getNumber() == number).toList();
            RecordLeaderDTO leader = finished == 0 || standings.isEmpty() ? null : new RecordLeaderDTO(
                    standings.getFirst().getDriver(), standings.getFirst().getTotalPoints(), standings.size() < 2 ? 0
                            : standings.getFirst().getTotalPoints() - standings.get(1).getTotalPoints());
            return new RecordSeasonDTO(number, entry.getValue().getFirst().getSeason().getYear(),
                    entry.getValue().size(), finished, finished < entry.getValue().size(), leader);
        }).toList();
        Map<Integer, Integer> finishedCounts = seasons.stream().collect(Collectors.toMap(
                RecordSeasonDTO::getNumber, RecordSeasonDTO::getFinishedRaces));
        List<RecordBoardDTO> driverBoards = new ArrayList<>();
        addDriverBoard(driverBoards, "poles", "Poles", false, false, driverStats, DriverStatsDTO::getPoles);
        addDriverBoard(driverBoards, "podiums", "Podios", false, false, driverStats, DriverStatsDTO::getPodiums);
        addDriverBoard(driverBoards, "fastLaps", "Vueltas rápidas", false, false, driverStats, DriverStatsDTO::getFastlaps);
        addDriverBoard(driverBoards, "victories", "Victorias", false, false, driverStats, DriverStatsDTO::getVictories);
        addDriverBoard(driverBoards, "winRate", "% de victorias", true, false, driverStats.stream()
                .filter(dto -> dto.getRaces() > 0 && 2 * dto.getRaces() >= finishedCounts
                        .getOrDefault(dto.getDriver().getSeason().getNumber(), 0)).toList(),
                dto -> round(100d * dto.getVictories() / dto.getRaces(), 1));
        addDriverBoard(driverBoards, "penalties", "Penalizaciones", false, true, driverStats, DriverStatsDTO::getPenalties);
        addDriverBoard(driverBoards, "racesFinished", "Carreras terminadas", false, false, driverStats,
                DriverStatsDTO::getRacesFinished);
        addDriverBoard(driverBoards, "points", "Puntos", false, false, driverStats, DriverStatsDTO::getTotalPoints);

        List<TeamStatsDTO> teamStats = recordTeamStats(rows, sprints);
        List<RecordBoardDTO> teamBoards = new ArrayList<>();
        addTeamBoard(teamBoards, "teamPoints", "Puntos de equipo", teamStats, TeamStatsDTO::getTotalPoints);
        addTeamBoard(teamBoards, "teamVictories", "Victorias de equipo", teamStats, TeamStatsDTO::getVictories);
        addTeamBoard(teamBoards, "teamDoublePodiums", "Dobles podios", teamStats, TeamStatsDTO::getDoublePodiums);

        Map<Long, Integer> raceOrders = new HashMap<>();
        calendars.values().forEach(calendar -> {
            for (int index = 0; index < calendar.size(); index++)
                raceOrders.put(calendar.get(index).getId(), index + 1);
        });
        Map<String, DriverDTO> latest = new HashMap<>();
        driverStats.forEach(dto -> latest.merge(dto.getDriver().getName(), dto.getDriver(),
                (first, second) -> first.getSeason().getNumber() >= second.getSeason().getNumber() ? first : second));
        return new StatisticsRecordsDTO(seasons, driverBoards, teamBoards,
                holderCounts(driverBoards, latest), victoryProgress(races, rows, driverStats, raceOrders, latest));
    }

    private boolean vacancy(String name) {
        return name.matches("(?i)^vacante[0-9]*$");
    }

    private List<TeamStatsDTO> recordTeamStats(List<Result> rows, List<Sprint> sprints) {
        Map<Long, List<Result>> byTeam = rows.stream().collect(Collectors.groupingBy(
                row -> row.getDriver().getTeam().getId()));
        // Use the surviving result's team for sprint points, as in the overview's evolution.
        Map<DriverRace, Result> surviving = rows.stream().collect(Collectors.toMap(
                row -> new DriverRace(row.getDriver().getName(), row.getRace().getId()), Function.identity()));
        Map<Long, List<Sprint>> teamSprints = sprints.stream().collect(Collectors.groupingBy(
                sprint -> sprintTeam(sprint, surviving).getId()));
        Map<Long, Driver> representatives = new HashMap<>();
        rows.forEach(row -> representatives.putIfAbsent(row.getDriver().getTeam().getId(), row.getDriver()));
        sprints.forEach(sprint -> representatives.putIfAbsent(sprint.getDriver().getTeam().getId(), sprint.getDriver()));
        return representatives.entrySet().stream().map(entry -> {
            List<Result> results = byTeam.getOrDefault(entry.getKey(), List.of());
            DriverInfoDTO info = driverService.buildInfo(List.of(entry.getValue()), results,
                    teamSprints.getOrDefault(entry.getKey(), List.of()), 0, 0);
            return teamStats(new TeamInfoDTO(info.getDriver().getTeam(), 0, info, List.of()), results, Map.of(), 0);
        }).toList();
    }

    private void addDriverBoard(List<RecordBoardDTO> boards, String key, String title, boolean percent,
            boolean negative, List<DriverStatsDTO> stats, Function<DriverStatsDTO, Number> value) {
        addBoard(boards, key, title, percent, negative, stats.stream().map(dto -> new RecordEntryDTO(
                0, value.apply(dto), dto.getDriver().getSeason().getNumber(), dto.getDriver(), null)).toList());
    }

    private void addTeamBoard(List<RecordBoardDTO> boards, String key, String title, List<TeamStatsDTO> stats,
            Function<TeamStatsDTO, Number> value) {
        addBoard(boards, key, title, false, false, stats.stream().map(dto -> new RecordEntryDTO(
                0, value.apply(dto), dto.getTeam().getSeason().getNumber(), null, dto.getTeam())).toList());
    }

    private void addBoard(List<RecordBoardDTO> boards, String key, String title, boolean percent,
            boolean negative, List<RecordEntryDTO> entries) {
        List<RecordEntryDTO> sorted = entries.stream().sorted(Comparator
                .comparingDouble((RecordEntryDTO entry) -> entry.getValue().doubleValue()).reversed()
                .thenComparingInt(RecordEntryDTO::getSeason).thenComparing(entry -> entry.getDriver() != null
                        ? entry.getDriver().getName() : entry.getTeam().getName())).toList();
        if (sorted.isEmpty() || sorted.getFirst().getValue().doubleValue() == 0)
            return;
        double cutoff = sorted.get(Math.min(4, sorted.size() - 1)).getValue().doubleValue();
        List<RecordEntryDTO> ranking = new ArrayList<>();
        int rank = 0;
        for (int index = 0; index < sorted.size(); index++) {
            RecordEntryDTO entry = sorted.get(index);
            if (entry.getValue().doubleValue() < cutoff)
                break;
            if (index == 0 || Double.compare(entry.getValue().doubleValue(),
                    sorted.get(index - 1).getValue().doubleValue()) != 0)
                rank = index + 1;
            entry.setRank(rank);
            ranking.add(entry);
        }
        boards.add(new RecordBoardDTO(key, title, percent, negative, sorted.getFirst().getValue(),
                ranking.stream().filter(entry -> entry.getRank() == 1).toList(), ranking));
    }

    private StatisticsRaceDTO statisticsRace(Race race) {
        return new StatisticsRaceDTO(race.getId(), race.getName(), race.getSeason().getNumber());
    }

    private List<RecordHolderCountDTO> holderCounts(List<RecordBoardDTO> boards, Map<String, DriverDTO> latest) {
        Map<String, List<RecordBoardDTO>> held = new HashMap<>();
        boards.forEach(board -> board.getHolders().stream().map(entry -> entry.getDriver().getName()).distinct()
                .forEach(name -> held.computeIfAbsent(name, key -> new ArrayList<>()).add(board)));
        return held.entrySet().stream().map(entry -> new RecordHolderCountDTO(latest.get(entry.getKey()),
                entry.getValue().size()))
                .sorted(Comparator.comparingInt(RecordHolderCountDTO::getCount).reversed()
                        .thenComparing(dto -> dto.getDriver().getName())).toList();
    }

    private VictoryProgressDTO victoryProgress(List<Race> races, List<Result> rows, List<DriverStatsDTO> stats,
            Map<Long, Integer> orders, Map<String, DriverDTO> latest) {
        Map<String, Integer> wins = new HashMap<>();
        Map<String, Integer> points = new HashMap<>();
        stats.forEach(dto -> {
            wins.merge(dto.getDriver().getName(), dto.getVictories(), Integer::sum);
            points.merge(dto.getDriver().getName(), dto.getTotalPoints(), Integer::sum);
        });
        Map<String, Map<Long, Integer>> byRace = rows.stream().filter(row -> position(row) == 1)
                .collect(Collectors.groupingBy(row -> row.getDriver().getName(), Collectors.toMap(
                        row -> row.getRace().getId(), row -> 1)));
        List<VictorySeriesDTO> series = wins.keySet().stream().sorted(Comparator
                .<String>comparingInt(wins::get).reversed()
                .thenComparing(Comparator.<String>comparingInt(points::get).reversed())
                .thenComparing(Comparator.naturalOrder())).limit(5).map(name -> {
                    List<Integer> accumulated = cumulative(races, byRace.getOrDefault(name, Map.of()));
                    Integer[] values = new Integer[races.size()];
                    for (int index = 0; index < races.size(); index++)
                        values[index] = races.get(index).getFinished() == 1 ? accumulated.get(index) : null;
                    return new VictorySeriesDTO(latest.get(name), values);
                }).toList();
        return new VictoryProgressDTO(races.stream().map(race -> new VictoryRaceDTO(statisticsRace(race),
                race.getSeason().getNumber(), orders.get(race.getId()), race.getFinished() == 1)).toList(), series);
    }

    public StatisticsHeadToHeadDTO getHeadToHead(int season, String a, String b) {
        if (a == null || b == null || a.isBlank() || b.isBlank() || a.strip().equalsIgnoreCase(b.strip())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Two distinct driver names are required");
        }
        StatisticsHeadToHeadDTO dto = new StatisticsHeadToHeadDTO(season, a, b, 0, 0, 0, 0, 0, 0,
                new ArrayList<>());
        if (season <= 0)
            return dto;

        List<Result> rows = deduplicate(resultRepository.findForStatistics(season));
        Map<Long, Result> byA = new HashMap<>();
        Map<Long, Result> byB = new HashMap<>();
        for (Result row : rows) {
            if (row.getRace().getFinished() != 1)
                continue;
            String name = row.getDriver().getName();
            if (name.strip().equalsIgnoreCase(a.strip()))
                byA.put(row.getRace().getId(), row);
            if (name.strip().equalsIgnoreCase(b.strip()))
                byB.put(row.getRace().getId(), row);
        }
        Map<String, Map<Long, Integer>> points = racePoints(rows, sprintRepository.findForStatistics(season), false);
        List<Result> common = byA.values().stream().filter(row -> byB.containsKey(row.getRace().getId()))
                .sorted(Comparator.comparing(Result::getRace, CHRONOLOGICAL)).toList();
        for (Result rowA : common) {
            Race race = rowA.getRace();
            Result rowB = byB.get(race.getId());
            int compared = Integer.compare(position(rowA), position(rowB));
            String result = compared < 0 ? "A" : compared > 0 ? "B" : "NONE";
            if (compared < 0)
                dto.setAheadA(dto.getAheadA() + 1);
            else if (compared > 0)
                dto.setAheadB(dto.getAheadB() + 1);
            if (rowA.getPosition() == null && rowB.getPosition() == null)
                dto.setBothDnf(dto.getBothDnf() + 1);
            dto.setPointsA(dto.getPointsA() + points.get(rowA.getDriver().getName()).get(race.getId()));
            dto.setPointsB(dto.getPointsB() + points.get(rowB.getDriver().getName()).get(race.getId()));
            dto.getRaces().add(new StatisticsHeadToHeadRaceDTO(
                    new StatisticsRaceDTO(race.getId(), race.getName(), race.getSeason().getNumber()),
                    rowA.getPosition() == null ? null : position(rowA),
                    rowB.getPosition() == null ? null : position(rowB), result));
        }
        dto.setComparable(dto.getAheadA() + dto.getAheadB());
        return dto;
    }

    private record DriverRace(String name, Long race) { }
    private record DriverSeason(String name, int season) { }

    private List<Result> deduplicate(List<Result> rows) {
        Map<DriverSeason, Map<String, Long>> teamCounts = rows.stream().collect(Collectors.groupingBy(
                row -> new DriverSeason(row.getDriver().getName(), row.getRace().getSeason().getNumber()),
                Collectors.groupingBy(row -> row.getDriver().getTeam().getName(), Collectors.counting())));
        Comparator<Result> preferred = Comparator.comparing((Result row) -> row.getPosition() == null)
                .thenComparing(Comparator.comparingLong((Result row) -> row.getPosition() != null ? 0 : teamCounts.get(
                        new DriverSeason(row.getDriver().getName(), row.getRace().getSeason().getNumber()))
                        .get(row.getDriver().getTeam().getName())).reversed())
                .thenComparing(Result::getId);
        Map<DriverRace, Result> unique = new HashMap<>();
        rows.forEach(row -> unique.merge(new DriverRace(row.getDriver().getName(), row.getRace().getId()), row,
                (first, second) -> preferred.compare(first, second) <= 0 ? first : second));
        return unique.values().stream().sorted(Comparator.comparing(Result::getRace, CHRONOLOGICAL)
                .thenComparing(Result::getId)).toList();
    }

    private DriverStatsDTO driverStats(DriverInfoDTO info, List<Result> rows, List<Penalty> penalties) {
        DriverStatsDTO dto = new DriverStatsDTO(info);
        dto.setRaces(rows.size());
        int[] distribution = new int[21];
        int winRun = 0;
        int podiumRun = 0;
        for (Result row : rows) {
            int position = position(row);
            distribution[position == Integer.MAX_VALUE ? 20 : position - 1]++;
            winRun = position == 1 ? winRun + 1 : 0;
            podiumRun = position <= 3 ? podiumRun + 1 : 0;
            dto.setWinStreak(Math.max(dto.getWinStreak(), winRun));
            dto.setPodiumStreak(Math.max(dto.getPodiumStreak(), podiumRun));
            if (position == 1 && row.getPole() == 1) {
                dto.setPoleWins(dto.getPoleWins() + 1);
                if (row.getFastlap() == 1)
                    dto.setHatTricks(dto.getHatTricks() + 1);
            }
        }
        dto.setCurrentPodiumStreak(podiumRun);
        dto.setPositionDistribution(distribution);
        dto.setDnfs(distribution[20]);
        var positions = rows.stream().filter(row -> row.getPosition() != null)
                .mapToInt(StatisticsService::position).summaryStatistics();
        if (positions.getCount() >= 8) {
            double variance = rows.stream().filter(row -> row.getPosition() != null)
                    .mapToDouble(row -> Math.pow(position(row) - positions.getAverage(), 2)).average().orElse(0);
            dto.setPosStd(round(Math.sqrt(variance), 1));
        }
        StatisticsPenaltiesDTO counts = new StatisticsPenaltiesDTO();
        for (Penalty penalty : penalties) {
            switch (penalty.getPenaltySeverity().getSeverity()) {
                case "Aviso" -> counts.setWarning(counts.getWarning() + 1);
                case "Leve" -> counts.setMinor(counts.getMinor() + 1);
                case "Grave" -> counts.setSerious(counts.getSerious() + 1);
                default -> { }
            }
        }
        dto.setPenaltiesBy(counts);
        return dto;
    }

    private TeamStatsDTO teamStats(TeamInfoDTO info, List<Result> rows, Map<String, Integer> driverPoints,
            int totalPoints) {
        TeamStatsDTO dto = new TeamStatsDTO(info);
        dto.setPointsShare(totalPoints == 0 ? 0 : round(100d * info.getTotalPoints() / totalPoints, 1));
        dto.setRaces(rows.size());
        dto.setDnfs((int) rows.stream().filter(row -> row.getPosition() == null).count());
        Map<Long, List<Result>> byRace = rows.stream().collect(Collectors.groupingBy(row -> row.getRace().getId()));
        dto.setDoublePoints((int) byRace.values().stream()
                .filter(race -> race.stream().filter(row -> row.getPosition() != null
                        && row.getPosition().getPoints() > 0).count() >= 2).count());
        dto.setDoublePodiums((int) byRace.values().stream()
                .filter(race -> race.stream().filter(row -> position(row) <= 3).count() >= 2).count());
        dto.setDrivers(mainDrivers(rows).stream()
                .map(name -> new TeamDriverStatsDTO(name, driverPoints.getOrDefault(name, 0))).toList());
        Map<Integer, List<Result>> bySeason = rows.stream()
                .collect(Collectors.groupingBy(row -> row.getRace().getSeason().getNumber()));
        dto.setDuels(bySeason.entrySet().stream().sorted(Map.Entry.comparingByKey())
                .filter(entry -> mainDrivers(entry.getValue()).size() == 2)
                .map(entry -> duel(entry.getKey(), entry.getValue())).toList());
        return dto;
    }

    private List<String> mainDrivers(List<Result> rows) {
        Map<String, Long> counts = rows.stream()
                .collect(Collectors.groupingBy(row -> row.getDriver().getName(), Collectors.counting()));
        return counts.keySet().stream().sorted(Comparator.<String>comparingLong(counts::get).reversed()
                .thenComparing(Comparator.naturalOrder())).limit(2).toList();
    }

    private TeamDuelDTO duel(int season, List<Result> rows) {
        List<String> names = mainDrivers(rows).stream().sorted().toList();
        TeamDuelDTO duel = new TeamDuelDTO(season, names.get(0), names.get(1), 0, 0, 0);
        Map<Long, Map<String, Result>> byRace = rows.stream().collect(Collectors.groupingBy(
                row -> row.getRace().getId(), Collectors.toMap(row -> row.getDriver().getName(), Function.identity())));
        for (Map<String, Result> race : byRace.values()) {
            Result a = race.get(duel.getA());
            Result b = race.get(duel.getB());
            if (a == null || b == null || (a.getPosition() == null && b.getPosition() == null))
                continue;
            int compared = Integer.compare(position(a), position(b));
            if (compared < 0)
                duel.setAAhead(duel.getAAhead() + 1);
            else if (compared > 0)
                duel.setBAhead(duel.getBAhead() + 1);
            else
                duel.setTied(duel.getTied() + 1);
        }
        return duel;
    }

    private Map<String, Map<Long, Integer>> racePoints(List<Result> rows, List<Sprint> sprints, boolean teams) {
        Map<String, Map<Long, Integer>> points = new HashMap<>();
        Map<DriverRace, Result> surviving = new HashMap<>();
        for (Result row : rows) {
            surviving.put(new DriverRace(row.getDriver().getName(), row.getRace().getId()), row);
            String name = teams ? row.getDriver().getTeam().getName() : row.getDriver().getName();
            int scored = ResultPoints.calculate(row);
            points.computeIfAbsent(name, key -> new HashMap<>()).merge(row.getRace().getId(), scored, Integer::sum);
        }
        for (Sprint sprint : sprints) {
            String name = teams ? sprintTeam(sprint, surviving).getName() : sprint.getDriver().getName();
            int scored = sprint.getPosition() == null ? 0 : sprint.getPosition().getPoints();
            points.computeIfAbsent(name, key -> new HashMap<>()).merge(sprint.getRace().getId(), scored, Integer::sum);
        }
        return points;
    }

    private Team sprintTeam(Sprint sprint, Map<DriverRace, Result> surviving) {
        Result row = surviving.get(new DriverRace(sprint.getDriver().getName(), sprint.getRace().getId()));
        return (row == null ? sprint.getDriver() : row.getDriver()).getTeam();
    }

    private List<Integer> cumulative(List<Race> races, Map<Long, Integer> points) {
        List<Integer> accumulated = new ArrayList<>();
        int total = 0;
        for (Race race : races) {
            total += points.getOrDefault(race.getId(), 0);
            accumulated.add(total);
        }
        return accumulated;
    }

    private <T> Map<String, Map<Integer, Integer>> pointsBySeason(List<T> info, Function<T, String> name,
            Function<T, Integer> season, Function<T, Integer> points) {
        Map<String, Map<Integer, Integer>> byName = new HashMap<>();
        info.forEach(dto -> byName.computeIfAbsent(name.apply(dto), key -> new LinkedHashMap<>())
                .merge(season.apply(dto), points.apply(dto), Integer::sum));
        return byName;
    }

    private static int position(Result row) {
        return row.getPosition() == null ? Integer.MAX_VALUE : row.getPosition().getPositionNumber();
    }

    private static double round(double value, int decimals) {
        double factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }
}
