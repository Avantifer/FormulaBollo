package formula.bollo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.FantasyElection;

@Repository
public interface FantasyElectionRepository extends JpaRepository<FantasyElection, Long> {
    @Query(value = "SELECT fe FROM FantasyElection fe WHERE fe.account.id = :accountId AND fe.race.id = :raceId")
    Optional<FantasyElection> findByUserIdAndRaceId(int accountId, int raceId);

    @Query(value = "SELECT fe FROM FantasyElection fe WHERE fe.race.id = :raceId")
    List<FantasyElection> findByRaceId(int raceId);
}
