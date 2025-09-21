package formula.bollo.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import formula.bollo.entity.Account;
import formula.bollo.repository.AccountRepository;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class MyUserDetailsService implements UserDetailsService {

    private AccountRepository accountRepository;

    public MyUserDetailsService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    /**
     * Loads user details from the database based on the provided username.
     * This method retrieves the user's account information and constructs
     * a UserDetails object for authentication and authorization purposes.
     *
     * @param username the username of the user to load
     * @return a UserDetails object containing the user's information and roles
     * @throws UsernameNotFoundException if the user with the given username is not
     *                                   found
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        List<Account> accounts = accountRepository.findByUsername(username);

        if (accounts.isEmpty()) {
            throw new UsernameNotFoundException("Usuario no encontrado");
        }

        Account account = accounts.get(0);

        List<GrantedAuthority> authorities = new ArrayList<>();
        if (account.getAdmin() == 1) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        } else {
            authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
        }

        return new User(account.getUsername(), account.getPassword(), authorities);
    }
}
