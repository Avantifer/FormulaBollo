package formula.bollo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.Sprint;
import jakarta.transaction.Transactional;

@Repository
public interface SprintRepository extends JpaRepository<Sprint, Long> {

    @Query("""
            SELECT s FROM Sprint s JOIN FETCH s.race race JOIN FETCH race.season LEFT JOIN FETCH s.position
            JOIN FETCH s.driver d JOIN FETCH d.season JOIN FETCH d.team t LEFT JOIN FETCH t.season
            WHERE (:season = 0 OR race.season.number = :season) ORDER BY s.id
            """)
    List<Sprint> findForStatistics(int season);

    @Modifying
    @Transactional
    @Query("DELETE FROM Sprint s WHERE s.race.id = :raceId")
    void deleteByRaceId(int raceId);

    @Query(value = "SELECT s FROM Sprint s WHERE s.race.season.number = :seasonNumber")
    List<Sprint> findBySeason(int seasonNumber);

    @Query(value = "SELECT s FROM Sprint s WHERE s.race.season.number = :seasonNumber AND s.driver.id IN :driverIds")
    List<Sprint> findBySeasonAndDrivers(int seasonNumber, List<Long> driverIds);

    @Query("SELECT s FROM Sprint s WHERE s.driver.id IN :driverIds")
    List<Sprint> findByDriverIds(List<Long> driverIds);

    @Query("SELECT s FROM Sprint s LEFT JOIN FETCH s.position WHERE s.driver.id IN :driverIds")
    List<Sprint> findWithPositionByDriverIds(List<Long> driverIds);

    @Query("SELECT s FROM Sprint s WHERE s.driver.team.id IN :teamIds")
    List<Sprint> findByTeamIds(List<Long> teamIds);

    @Query(value = "SELECT s FROM Sprint s WHERE s.race.id = :raceId")
    List<Sprint> findByRaceId(int raceId);
}
