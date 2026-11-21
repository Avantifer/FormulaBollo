package formula.bollo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.Team;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {

    @Query("""
            SELECT t FROM Team t JOIN FETCH t.season
            WHERE (:season = 0 OR t.season.number = :season) ORDER BY t.id
            """)
    List<Team> findForStatistics(int season);

    @Query("SELECT t FROM Team t LEFT JOIN FETCH t.season WHERE t.id IN :teamIds")
    List<Team> findWithSeasonByIdIn(List<Long> teamIds);
    
    @Query(value = "SELECT t FROM Team t WHERE t.season.number = :seasonNumber")
    List<Team> findBySeason(int seasonNumber);

    @Query(value = "SELECT t FROM Team t WHERE t.name = :teamName")
    List<Team> findByName(String teamName);
    
    @Query(value = "SELECT t FROM Team t WHERE t.season.number = :seasonNumber AND t.name = :teamName")
    List<Team> findByNameAndSeason(int seasonNumber, String teamName);
}
