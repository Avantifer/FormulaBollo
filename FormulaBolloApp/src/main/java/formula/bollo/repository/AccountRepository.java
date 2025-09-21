package formula.bollo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import formula.bollo.entity.Account;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {
    List<Account> findByUsername(String username); 
    List<Account> findByEmail(String email);
}