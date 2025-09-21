package formula.bollo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.Position;

@Repository
public interface PositionRepository extends JpaRepository<Position, Long> {
    
        
}