package formula.bollo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.FantasyPriceDriver;

@Repository
public interface FantasyPriceDriverRepository extends JpaRepository<FantasyPriceDriver, Long> {
    @Query(value = "SELECT fpd FROM FantasyPriceDriver fpd WHERE fpd.race.id = :raceId")
    List<FantasyPriceDriver> findByRaceId(int raceId);

    @Query("SELECT fp FROM FantasyPriceDriver fp WHERE fp.driver.id = :driverId ORDER BY fp.race.id DESC LIMIT 2")
    List<FantasyPriceDriver> findTwoLastPrices(int driverId);

    @Query("SELECT fp FROM FantasyPriceDriver fp WHERE fp.driver.id = :driverId")
    List<FantasyPriceDriver> findByDriverId(int driverId);

    @Query("SELECT fpd FROM FantasyPriceDriver fpd WHERE fpd.driver.id IN :driverIds ORDER BY fpd.driver.id, fpd.race.id")
    List<FantasyPriceDriver> findTwoLastPricesForAllDrivers(List<Long> driverIds);
}