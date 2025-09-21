package formula.bollo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.FantasyPointsTeam;

@Repository
public interface FantasyPointsTeamRepository extends JpaRepository<FantasyPointsTeam, Long> {
    @Query("SELECT fpt FROM FantasyPointsTeam fpt WHERE fpt.race.id = :raceId")
    List<FantasyPointsTeam> findByRaceId(int raceId);

    @Query("SELECT fp FROM FantasyPointsTeam fp WHERE fp.team.id = ?1")
    List<FantasyPointsTeam> findByTeamId(int teamId);

    @Query("SELECT fpt FROM FantasyPointsTeam fpt WHERE fpt.team.id IN :teamIds")
    List<FantasyPointsTeam> findByTeamIds(List<Long> teamIds);

    @Query("SELECT fpt FROM FantasyPointsTeam fpt WHERE fpt.team.id = :teamId AND fpt.race.id = :raceId")
    Optional<FantasyPointsTeam> findByTeamIdAndRaceId(int teamId, int raceId);
}