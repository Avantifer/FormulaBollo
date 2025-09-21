package formula.bollo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.Team;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    
    @Query(value = "SELECT t FROM Team t WHERE t.season.number = :seasonNumber")
    List<Team> findBySeason(int seasonNumber);

    @Query(value = "SELECT t FROM Team t WHERE t.name = :teamName")
    List<Team> findByName(String teamName);
    
    @Query(value = "SELECT t FROM Team t WHERE t.season.number = :seasonNumber AND t.name = :teamName")
    List<Team> findByNameAndSeason(int seasonNumber, String teamName);
}
