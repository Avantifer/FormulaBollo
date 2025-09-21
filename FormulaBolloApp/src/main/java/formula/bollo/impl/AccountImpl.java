package formula.bollo.impl;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import formula.bollo.entity.Account;
import formula.bollo.mapper.AccountMapper;
import formula.bollo.model.AccountDTO;

@Service
public class AccountImpl {
    private BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private AccountMapper accountMapper;

    public AccountImpl(AccountMapper accountMapper) {
        this.accountMapper = accountMapper;
    }

    public AccountDTO accountToAccountDTO(Account account) {
        return this.accountMapper.accountToAccountDTO(account);
    }

    public Account accountDTOToAccount(AccountDTO accountDTO) {
        Account account = this.accountMapper.accountDTOToAccount(accountDTO);
        if (account.getId() != null && account.getId() == 0) {
            account.setId(null);
        }

        if (accountDTO.getPassword() != null) {
            account.setPassword(this.passwordEncoder.encode(accountDTO.getPassword()));
        }
        return account;
    }
}
