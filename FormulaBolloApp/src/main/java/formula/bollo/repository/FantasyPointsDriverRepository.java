package formula.bollo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.FantasyPointsDriver;

@Repository
public interface FantasyPointsDriverRepository extends JpaRepository<FantasyPointsDriver, Long> {
    @Query(value = "SELECT fpd FROM FantasyPointsDriver fpd WHERE fpd.race.id = :raceId")
    List<FantasyPointsDriver> findByRaceId(int raceId);

    @Query(value = "SELECT fpd FROM FantasyPointsDriver fpd WHERE fpd.driver.id = :driverId")
    List<FantasyPointsDriver> findByDriverId(int driverId);

    @Query("SELECT fpd FROM FantasyPointsDriver fpd WHERE fpd.driver.id IN :driverIds")
    List<FantasyPointsDriver> findByDriverIds(List<Long> driverIds);

    @Query("SELECT fpd FROM FantasyPointsDriver fpd WHERE fpd.driver.id = :driverId AND fpd.race.id = :raceId")
    Optional<FantasyPointsDriver> findByDriverIdAndRaceId(int driverId, int raceId);
}