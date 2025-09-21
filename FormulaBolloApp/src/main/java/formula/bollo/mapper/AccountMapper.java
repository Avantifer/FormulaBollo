package formula.bollo.mapper;

import org.mapstruct.Mapper;

import formula.bollo.entity.Account;
import formula.bollo.model.AccountDTO;

@Mapper(componentModel = "spring")
public interface AccountMapper {
    public AccountDTO accountToAccountDTO(Account account);

    public Account accountDTOToAccount(AccountDTO accountDTO);
}
