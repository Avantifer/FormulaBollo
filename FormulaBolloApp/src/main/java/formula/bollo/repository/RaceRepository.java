package formula.bollo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.Race;

@Repository
public interface RaceRepository extends JpaRepository<Race, Long> {
    @Query("SELECT r FROM Race r JOIN FETCH r.season WHERE r.id = :id")
    Optional<Race> findWithSeasonById(long id);

    @Query("""
            SELECT r FROM Race r JOIN FETCH r.season
            WHERE (:season = 0 OR r.season.number = :season) ORDER BY r.id
            """)
    List<Race> findForStatistics(int season);
    
    @Query("SELECT r FROM Race r WHERE r.name = :name AND r.season.number = :seasonNumber")
    Optional<Race> findByNameAndSeason(String name, int seasonNumber);

    @Query("SELECT r FROM Race r WHERE r.season.number = :seasonNumber")
    List<Race> findBySeason(int seasonNumber);

    @Query("SELECT r FROM Race r WHERE r.finished = 1 AND r.season.number = :seasonNumber ORDER BY r.dateStart ASC, r.id ASC")
    List<Race> findAllFinished(int seasonNumber);
    
    @Query("SELECT r FROM Race r WHERE r.finished = 0 AND r.season.number = :seasonNumber ORDER BY r.dateStart ASC, r.id ASC LIMIT 1")
    Optional<Race> findActualBySeason(int seasonNumber);
}
