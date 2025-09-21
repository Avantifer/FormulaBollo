package formula.bollo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.PenaltySeverity;

@Repository
public interface PenaltySeverityRepository extends JpaRepository<PenaltySeverity, Long> {
    
        
}