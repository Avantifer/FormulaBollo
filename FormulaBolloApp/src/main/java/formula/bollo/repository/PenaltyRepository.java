package formula.bollo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.Penalty;
import formula.bollo.model.RecordDTO;

@Repository
public interface PenaltyRepository extends JpaRepository<Penalty, Long> {

    @Query(value = "SELECT COUNT(p) FROM Penalty p WHERE p.driver.id IN :driverIds")
    int findByDriverIds(List<Long> driverIds);

    @Query(value = "SELECT p FROM Penalty p WHERE p.race.id = :race")
    List<Penalty> findByRaceId(Long race);

    @Query(value = "SELECT p FROM Penalty p WHERE p.season.number = :seasonNumber")
    List<Penalty> findBySeason(int seasonNumber);

    @Query(value = "SELECT p FROM Penalty p WHERE p.driver.id = :driverId AND p.race.id = :raceId AND p.penaltySeverity.id = :severityId AND p.season.number = :seasonNumber")
    List<Penalty> findByDriverAndRaceAndSeverity(int driverId, int raceId, int severityId, int seasonNumber);

    @Query("""
            SELECT new formula.bollo.model.RecordDTO(
                'Mayor número de penalizaciones en una temporada',
                COUNT(p),
                p.driver,
                p.driver.team,
                p.driver.season
            )
            FROM Penalty p
            GROUP BY p.driver, p.driver.season
            ORDER BY COUNT(p) DESC
            """)
    List<RecordDTO> recordPenaltiesDriver();

    @Query(value = "SELECT p FROM Penalty p WHERE p.driver.id = :driverId AND p.race.id = :raceId")
    List<Penalty> findByDriverAndRace(int driverId, int raceId);
}
