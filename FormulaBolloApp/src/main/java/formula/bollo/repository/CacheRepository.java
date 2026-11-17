package formula.bollo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.Cache;

@Repository
public interface CacheRepository extends JpaRepository<Cache, String> {
    @Modifying
    @Transactional
    @Query("UPDATE Cache c SET c.version = c.version + 1 WHERE c.name = :name")
    int incrementVersion(@Param("name") String name);
}
