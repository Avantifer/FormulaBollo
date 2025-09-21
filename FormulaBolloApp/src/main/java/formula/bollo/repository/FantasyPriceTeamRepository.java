package formula.bollo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.FantasyPriceTeam;

@Repository
public interface FantasyPriceTeamRepository extends JpaRepository<FantasyPriceTeam, Long> {
    @Query(value = "SELECT fpt FROM FantasyPriceTeam fpt WHERE fpt.race.id = :raceId")
    List<FantasyPriceTeam> findByRaceId(int raceId);

    @Query("SELECT fpt FROM FantasyPriceTeam fpt WHERE fpt.team.id = :teamId")
    List<FantasyPriceTeam> findByTeamId(int teamId);
    
    @Query("SELECT fpt FROM FantasyPriceTeam fpt WHERE fpt.team.id IN :teamIds ORDER BY fpt.team.id, fpt.race.id")
    List<FantasyPriceTeam> findTwoLastPricesForAllTeams(List<Long> teamIds);
}