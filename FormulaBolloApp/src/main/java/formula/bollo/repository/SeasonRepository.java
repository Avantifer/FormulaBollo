package formula.bollo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.Season;

@Repository
public interface SeasonRepository extends JpaRepository<Season, Long> {

    Season findByNumber(int number);

    @Query("SELECT d.season FROM Driver d WHERE d.name = :driverName")
    List<Season> findSeasonsByDriverName(String driverName);

    @Query("SELECT t.season FROM Team t WHERE t.name = :teamName")
    List<Season> findSeasonsByTeamName(String teamName);

    @Query("SELECT DISTINCT r.season FROM FantasyElection fe JOIN fe.race r")
    List<Season> findSeasonsByFantasyElection();
}