package formula.bollo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.FantasyPointsDriver;

@Repository
public interface FantasyPointsDriverRepository extends JpaRepository<FantasyPointsDriver, Long> {
    @Query(value = "SELECT fpd FROM FantasyPointsDriver fpd WHERE fpd.race.id = :raceId")
    List<FantasyPointsDriver> findByRaceId(int raceId);

    List<FantasyPointsDriver> findByRaceIdIn(List<Long> raceIds);

    @Query(value = "SELECT fpd FROM FantasyPointsDriver fpd WHERE fpd.driver.id = :driverId")
    List<FantasyPointsDriver> findByDriverId(int driverId);

    @Query("SELECT fpd FROM FantasyPointsDriver fpd WHERE fpd.driver.id IN :driverIds AND fpd.race.id IN :raceIds")
    List<FantasyPointsDriver> findByDriverIdsAndRaceIds(List<Long> driverIds, List<Long> raceIds);
}
