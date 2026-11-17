package formula.bollo.utils;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

import formula.bollo.model.DriverDTO;
import formula.bollo.model.RaceDTO;

public final class ResultBatchValidator {
    private ResultBatchValidator() { }

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
