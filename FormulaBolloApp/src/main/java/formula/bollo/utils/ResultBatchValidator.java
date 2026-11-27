package formula.bollo.utils;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

import formula.bollo.model.DriverDTO;
import formula.bollo.model.RaceDTO;
import formula.bollo.model.ResultDTO;
import formula.bollo.model.SprintDTO;

public final class ResultBatchValidator {
    private ResultBatchValidator() { }

    public static boolean isValidResults(List<ResultDTO> entries) {
        if (!isValid(entries, ResultDTO::getRace, ResultDTO::getDriver)) {
            return false;
        }
        Set<Long> positionIds = new HashSet<>();
        int poles = 0;
        int fastlaps = 0;
        for (ResultDTO entry : entries) {
            if (entry.getPosition() != null && !addPosition(entry.getPosition().getId(), positionIds)) {
                return false;
            }
            if (entry.getPole() < 0 || entry.getPole() > 1 || entry.getFastlap() < 0 || entry.getFastlap() > 1) {
                return false;
            }
            poles += entry.getPole();
            fastlaps += entry.getFastlap();
            if (poles > 1 || fastlaps > 1) {
                return false;
            }
        }
        return true;
    }

    public static boolean isValidSprints(List<SprintDTO> entries) {
        if (!isValid(entries, SprintDTO::getRace, SprintDTO::getDriver)) {
            return false;
        }
        Set<Long> positionIds = new HashSet<>();
        for (SprintDTO entry : entries) {
            if (entry.getPosition() != null && !addPosition(entry.getPosition().getId(), positionIds)) {
                return false;
            }
        }
        return true;
    }

    private static boolean addPosition(Long positionId, Set<Long> positionIds) {
        return positionId != null && positionIds.add(positionId);
    }

    public static <T> boolean isValid(List<T> entries, Function<T, RaceDTO> raceOf,
            Function<T, DriverDTO> driverOf) {
        if (entries == null || entries.isEmpty()) {
            return false;
        }
        Long raceId = null;
        Long seasonId = null;
        Set<Long> driverIds = new HashSet<>();
        for (T entry : entries) {
            if (entry == null) {
                return false;
            }
            RaceDTO race = raceOf.apply(entry);
            DriverDTO driver = driverOf.apply(entry);
            if (race == null || race.getId() == null || race.getSeason() == null
                    || race.getSeason().getId() == null || driver == null || driver.getId() == null
                    || driver.getSeason() == null || driver.getSeason().getId() == null) {
                return false;
            }
            if (raceId == null) {
                raceId = race.getId();
                seasonId = race.getSeason().getId();
            }
            if (!raceId.equals(race.getId()) || !seasonId.equals(race.getSeason().getId())
                    || !seasonId.equals(driver.getSeason().getId()) || !driverIds.add(driver.getId())) {
                return false;
            }
        }
        return true;
    }
}
