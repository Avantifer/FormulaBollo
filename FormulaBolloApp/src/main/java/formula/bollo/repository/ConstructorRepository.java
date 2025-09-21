package formula.bollo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.Constructor;

@Repository
public interface ConstructorRepository extends JpaRepository<Constructor, Long> {

    @Query(value = "SELECT COUNT(c) FROM Constructor c WHERE c.team.id IN (:teamId)")
    int findByTeamId(List<Long> teamId);
}
