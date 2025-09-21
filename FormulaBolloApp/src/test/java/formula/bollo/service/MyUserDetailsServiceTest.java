package formula.bollo.service;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import formula.bollo.entity.Account;
import formula.bollo.repository.AccountRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.util.Arrays;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MyUserDetailsServiceTest {

    @InjectMocks
    private MyUserDetailsService myUserDetailsService;

    @Mock
    private AccountRepository accountRepository;

    @Test
    void loadUserByUsernameAccountNotFound() {
        assertThrows(UsernameNotFoundException.class, () -> {
            myUserDetailsService.loadUserByUsername("Avantifer");
        });
    }

    @Test
    void loadUserByUsernameAccountNoAdmin() {
        Account account = new Account(1L, "Avantifer", "123", 0, "email@mail.com");

        when(accountRepository.findByUsername(anyString())).thenReturn(Arrays.asList(account));

        UserDetails userDetails = myUserDetailsService.loadUserByUsername("Avantifer");

        assertEquals("Avantifer", userDetails.getUsername());
    }

    @Test
    void loadUserByUsernameAccount() {
        Account account = new Account(1L, "Avantifer", "123", 1, "email@mail.com");

        when(accountRepository.findByUsername(anyString())).thenReturn(Arrays.asList(account));

        UserDetails userDetails = myUserDetailsService.loadUserByUsername("Avantifer");

        assertEquals("Avantifer", userDetails.getUsername());
    }
}
