package formula.bollo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.Championship;

@Repository
public interface ChampionshipRepository extends JpaRepository<Championship, Long> {
        
    @Query(value = "SELECT COUNT(c) FROM Championship c WHERE c.driver.id IN :driverIds")
    int findByDriverIds(List<Long> driverIds);

    /** Pares [driverId, nº de campeonatos] de una sola vez (pilotos sin títulos no aparecen). */
    @Query("SELECT c.driver.id, COUNT(c) FROM Championship c WHERE c.driver.id IN :driverIds GROUP BY c.driver.id")
    List<Object[]> countByDriver(List<Long> driverIds);
}
