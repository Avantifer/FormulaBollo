package formula.bollo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.Driver;

@Repository
public interface DriverRepository extends JpaRepository<Driver, Long> {

    @Query("""
            SELECT d FROM Driver d JOIN FETCH d.season JOIN FETCH d.team t LEFT JOIN FETCH t.season
            WHERE (:season = 0 OR d.season.number = :season) ORDER BY d.id
            """)
    List<Driver> findForStatistics(int season);

    @Query("SELECT d FROM Driver d WHERE d.season.number = :seasonNumber")
    List<Driver> findBySeason(int seasonNumber);

    @Query("SELECT d FROM Driver d WHERE d.season.number = :seasonNumber")
    List<Driver> findAllBySeason(int seasonNumber);

    @Query(value = "SELECT d FROM Driver d WHERE d.team.id = :teamId")
    List<Driver> findByTeamId(Long teamId);

    @Query("SELECT d FROM Driver d LEFT JOIN FETCH d.season LEFT JOIN FETCH d.team WHERE d.team.id IN :teamIds")
    List<Driver> findByTeamIdIn(List<Long> teamIds);

    @Query(value = "SELECT d FROM Driver d WHERE d.team.name = :teamName")
    List<Driver> findByTeamName(String teamName);

    @Query(value = "SELECT d FROM Driver d WHERE d.season.number = :seasonNumber AND d.team.name = :teamName")
    List<Driver> findByTeamNameAndSeason(int seasonNumber, String teamName);

    @Query(value = "SELECT d FROM Driver d WHERE d.name = :driverName")
    List<Driver> findByName(String driverName);

    @Query("SELECT d FROM Driver d JOIN FETCH d.season s JOIN FETCH d.team t "
            + "LEFT JOIN FETCH t.season WHERE d.name = :driverName ORDER BY s.number ASC, d.id ASC")
    List<Driver> findTeamHistoryByName(String driverName);

    @Query(value = "SELECT d FROM Driver d WHERE d.season.number = :seasonNumber AND d.name = :driverName")
    List<Driver> findByNameAndSeason(int seasonNumber, String driverName);
}
