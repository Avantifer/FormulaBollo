package formula.bollo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.Result;
import formula.bollo.model.RecordDTO;
import jakarta.transaction.Transactional;

@Repository
public interface ResultRepository extends JpaRepository<Result, Long> {

    @Modifying
    @Transactional
    @Query("DELETE FROM Result r WHERE r.race.id = :raceId")
    void deleteByRaceId(int raceId);

    @Query("SELECT r FROM Result r WHERE r.race.season.number = :seasonNumber")
    List<Result> findBySeason(int seasonNumber);

    @Query("SELECT r FROM Result r WHERE r.race.season.number = :seasonNumber AND r.driver.id IN :driverIds")
    List<Result> findBySeasonAndDrivers(int seasonNumber, List<Long> driverIds);

    @Query(value = "SELECT r FROM Result r WHERE r.race.id = :raceId")
    List<Result> findByRaceId(int raceId);

    @Query("SELECT r FROM Result r WHERE r.driver.id IN :driverIds")
    List<Result> findByDriverIds(List<Long> driverIds);

    @Query("SELECT r FROM Result r WHERE r.driver.team.id IN :teamIds")
    List<Result> findByTeamIds(List<Long> teamIds);

    @Query(value = "SELECT COUNT(r) FROM Result r WHERE r.driver.id IN :driverIds AND r.pole = 1")
    int polesByDriverIds(List<Long> driverIds);

    @Query(value = "SELECT COUNT(r) FROM Result r WHERE r.driver.id IN :driverIds AND r.fastlap = 1")
    int fastlapByDriverIds(List<Long> driverIds);

    @Query(value = "SELECT COUNT(r) FROM Result r WHERE r.driver.id IN :driverIds AND r.position IS NOT NULL")
    int racesFinishedByDriverIds(List<Long> driverIds);

    @Query(value = "SELECT COUNT(r) FROM Result r WHERE r.driver.id IN :driverIds AND r.position.positionNumber IS NOT NULL AND r.position.positionNumber <= 3")
    int podiumsByDriverIds(List<Long> driverIds);

    @Query(value = "SELECT COUNT(r) FROM Result r WHERE r.driver.id IN :driverIds AND r.position.positionNumber = 1")
    int victoriesByDriverIds(List<Long> driverIds);

    @Query(value = "SELECT AVG(r.position.positionNumber) FROM Result r WHERE r.driver.id IN :driverIds")
    Double averagePositionByDriverIds(List<Long> driverIds);

    @Query(value = "SELECT r FROM Result r WHERE r.driver.id IN :driverIds AND r.position IS NOT NULL ORDER BY r.position.positionNumber ASC LIMIT 1")
    List<Result> bestResultByDriverIds(List<Long> driverIds);

    @Query(value = "SELECT r FROM Result r WHERE r.driver.id IN :driverIds AND r.position IS NOT NULL ORDER BY r.race.dateStart DESC LIMIT 5")
    List<Result> last5ResultsByDriverIds(List<Long> driverIds);

    @Query("""
            SELECT r
            FROM Result r
            WHERE r.driver.team.id IN :teamIds
                AND r.race.id NOT IN (
                    SELECT r2.race.id
                    FROM Result r2
                    WHERE r2.driver.team.id IN :teamIds
                    GROUP BY r2.race.id, r2.driver.team.id
                    HAVING SUM(r2.position IS NOT NULL) = 0
                )
            ORDER BY r.race.dateStart DESC
            LIMIT 15
            """)
    List<Result> last5ResultsByTeamIds(List<Long> teamIds);

    @Query("""
            SELECT new formula.bollo.model.RecordDTO(
                'Mayor número de poles en una temporada',
                COUNT(r),
                r.driver,
                r.driver.team,
                r.driver.season
            )
            FROM Result r
            WHERE r.pole = 1
            GROUP BY r.driver, r.driver.season.id
            ORDER BY COUNT(r) DESC
            LIMIT 1
            """)
    List<RecordDTO> recordPoleDriver();

    @Query("""
            SELECT new formula.bollo.model.RecordDTO(
                'Mayor número de podios en una temporada',
                COUNT(r),
                r.driver,
                r.driver.team,
                r.driver.season
            )
            FROM Result r
            WHERE r.position.positionNumber IS NOT NULL AND r.position.positionNumber <= 3
            GROUP BY r.driver, r.driver.season.id
            ORDER BY COUNT(r) DESC
            LIMIT 1
            """)
    List<RecordDTO> recordPodiumsDriver();

    @Query("""
            SELECT new formula.bollo.model.RecordDTO(
                'Mayor número de vueltas rápidas en una temporada',
                COUNT(r),
                r.driver,
                r.driver.team,
                r.driver.season
            )
            FROM Result r
            WHERE r.fastlap = 1
            GROUP BY r.driver, r.driver.season.id
            ORDER BY COUNT(r) DESC
            LIMIT 1
            """)
    List<RecordDTO> recordFastlapDriver();

    @Query("""
            SELECT new formula.bollo.model.RecordDTO(
                'Mayor número de victorias en una temporada',
                COUNT(r),
                r.driver,
                r.driver.team,
                r.driver.season
            )
            FROM Result r
            WHERE  r.position.positionNumber IS NOT NULL AND r.position.positionNumber = 1
            GROUP BY r.driver, r.driver.season.id
            ORDER BY COUNT(r) DESC
            LIMIT 1
            """)
    List<RecordDTO> recordVictoriesDriver();

    @Query("""
            SELECT new formula.bollo.model.RecordDTO(
                'Mayor porcentaje de victorias en una temporada',
                ROUND(100.0 * COUNT(CASE WHEN r.position.positionNumber = 1 THEN 1 END) / COUNT(r), 2),
                r.driver,
                r.driver.team,
                r.driver.season
            )
            FROM Result r
            WHERE r.position.positionNumber IS NOT NULL
            GROUP BY r.driver, r.driver.season
            ORDER BY ROUND(100.0 * COUNT(CASE WHEN r.position.positionNumber = 1 THEN 1 END) / COUNT(r), 2) DESC
            """)
    List<RecordDTO> recordPorcentageVictoriesDriver();

    @Query("""
            SELECT new formula.bollo.model.RecordDTO(
                'Mayor número de carreras terminadas en una temporada',
                COUNT(r),
                r.driver,
                r.driver.team,
                r.driver.season
            )
            FROM Result r
            WHERE r.position.positionNumber IS NOT NULL
            GROUP BY r.driver, r.driver.season
            ORDER BY COUNT(r) DESC
            """)
    List<RecordDTO> recordRacesFinishedDriver();
}
