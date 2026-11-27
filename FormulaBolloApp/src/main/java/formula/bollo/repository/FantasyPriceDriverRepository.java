package formula.bollo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.FantasyPriceDriver;

@Repository
public interface FantasyPriceDriverRepository extends JpaRepository<FantasyPriceDriver, Long> {
    @Query("SELECT d FROM Driver d JOIN FETCH d.season JOIN FETCH d.team t JOIN FETCH t.season WHERE d.season.number = :season ORDER BY d.id")
    List<formula.bollo.entity.Driver> findSeasonDrivers(int season);

    @Query("SELECT p FROM FantasyPriceDriver p JOIN FETCH p.driver d JOIN FETCH d.season JOIN FETCH d.team t JOIN FETCH t.season JOIN FETCH p.race r JOIN FETCH r.season WHERE r.season.number <= :season")
    List<FantasyPriceDriver> findHistory(int season);

    @Query(value = "SELECT fpd FROM FantasyPriceDriver fpd WHERE fpd.race.id = :raceId")
    List<FantasyPriceDriver> findByRaceId(int raceId);

    @Query("SELECT fp FROM FantasyPriceDriver fp WHERE fp.driver.id = :driverId")
    List<FantasyPriceDriver> findByDriverId(int driverId);
}
