package formula.bollo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.FantasyElection;

@Repository
public interface FantasyElectionRepository extends JpaRepository<FantasyElection, Long> {
    @Query(value = "SELECT fe FROM FantasyElection fe WHERE fe.account.id = :accountId AND fe.race.id = :raceId")
    Optional<FantasyElection> findByUserIdAndRaceId(int accountId, int raceId);

    @EntityGraph(attributePaths = { "account", "race", "driverOne.season", "driverOne.team.season",
            "driverTwo.season", "driverTwo.team.season", "driverThree.season", "driverThree.team.season",
            "teamOne.season", "teamTwo.season" })
    @Query("""
            SELECT fe FROM FantasyElection fe WHERE fe.race.id IN :raceIds
            AND fe.driverOne IS NOT NULL AND fe.driverTwo IS NOT NULL AND fe.driverThree IS NOT NULL
            AND fe.teamOne IS NOT NULL AND fe.teamTwo IS NOT NULL
            """)
    List<FantasyElection> findCompleteByRaceIds(List<Long> raceIds);
}
