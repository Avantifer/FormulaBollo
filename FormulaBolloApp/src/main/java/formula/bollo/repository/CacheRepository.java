package formula.bollo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.Cache;

@Repository
public interface CacheRepository extends JpaRepository<Cache, String> {

}