package formula.bollo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.Penalty;

@Repository
public interface PenaltyRepository extends JpaRepository<Penalty, Long> {

    @Query("""
            SELECT p FROM Penalty p JOIN FETCH p.penaltySeverity JOIN FETCH p.driver d JOIN FETCH d.season
            JOIN FETCH d.team t LEFT JOIN FETCH t.season JOIN FETCH p.season
            WHERE (:season = 0 OR p.season.number = :season) ORDER BY p.id
            """)
    List<Penalty> findForStatistics(int season);

    @Query(value = "SELECT COUNT(p) FROM Penalty p WHERE p.driver.id IN :driverIds")
    int findByDriverIds(List<Long> driverIds);

    /** Pares [driverId, nº de sanciones] de una sola vez (pilotos sin sanciones no aparecen). */
    @Query("SELECT p.driver.id, COUNT(p) FROM Penalty p WHERE p.driver.id IN :driverIds GROUP BY p.driver.id")
    List<Object[]> countByDriver(List<Long> driverIds);

    @Query(value = "SELECT p FROM Penalty p WHERE p.race.id = :race")
    List<Penalty> findByRaceId(Long race);

    @Query(value = "SELECT p FROM Penalty p WHERE p.season.number = :seasonNumber")
    List<Penalty> findBySeason(int seasonNumber);

    @Query(value = "SELECT p FROM Penalty p WHERE p.driver.id = :driverId AND p.race.id = :raceId AND p.penaltySeverity.id = :severityId AND p.season.number = :seasonNumber")
    List<Penalty> findByDriverAndRaceAndSeverity(int driverId, int raceId, int severityId, int seasonNumber);

    @Query(value = "SELECT p FROM Penalty p WHERE p.driver.id = :driverId AND p.race.id = :raceId AND p.penaltySeverity.id = :severityId")
    List<Penalty> findByDriverAndRaceAndSeverity(int driverId, int raceId, int severityId);
}
