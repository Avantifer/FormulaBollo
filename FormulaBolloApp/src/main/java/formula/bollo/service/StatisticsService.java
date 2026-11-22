package formula.bollo.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import formula.bollo.entity.Penalty;
import formula.bollo.entity.Race;
import formula.bollo.entity.Result;
import formula.bollo.entity.Sprint;
import formula.bollo.model.*;
import formula.bollo.repository.DriverRepository;
import formula.bollo.repository.PenaltyRepository;
import formula.bollo.repository.RaceRepository;
import formula.bollo.repository.ResultRepository;
import formula.bollo.repository.SprintRepository;
import formula.bollo.repository.TeamRepository;

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
            int scored = row.getPosition() == null ? 0 : row.getPosition().getPoints() + row.getFastlap();
            points.computeIfAbsent(name, key -> new HashMap<>()).merge(row.getRace().getId(), scored, Integer::sum);
        }
        for (Sprint sprint : sprints) {
            Result row = surviving.get(new DriverRace(sprint.getDriver().getName(), sprint.getRace().getId()));
            String name = !teams ? sprint.getDriver().getName()
                    : row == null ? sprint.getDriver().getTeam().getName() : row.getDriver().getTeam().getName();
            int scored = sprint.getPosition() == null ? 0 : sprint.getPosition().getPoints();
            points.computeIfAbsent(name, key -> new HashMap<>()).merge(sprint.getRace().getId(), scored, Integer::sum);
        }
        return points;
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
