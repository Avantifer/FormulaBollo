package formula.bollo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.FantasyPriceTeam;

@Repository
public interface FantasyPriceTeamRepository extends JpaRepository<FantasyPriceTeam, Long> {
    @Query("SELECT t FROM Team t JOIN FETCH t.season WHERE t.season.number = :season ORDER BY t.id")
    List<formula.bollo.entity.Team> findSeasonTeams(int season);

    @Query("SELECT p FROM FantasyPriceTeam p JOIN FETCH p.team t JOIN FETCH t.season JOIN FETCH p.race r JOIN FETCH r.season WHERE r.season.number <= :season")
    List<FantasyPriceTeam> findHistory(int season);

    @Query(value = "SELECT fpt FROM FantasyPriceTeam fpt WHERE fpt.race.id = :raceId")
    List<FantasyPriceTeam> findByRaceId(int raceId);

    @Query("SELECT fpt FROM FantasyPriceTeam fpt WHERE fpt.team.id = :teamId")
    List<FantasyPriceTeam> findByTeamId(int teamId);
}
