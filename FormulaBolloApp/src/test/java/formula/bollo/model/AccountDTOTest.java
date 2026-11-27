package formula.bollo.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.List;

import org.junit.jupiter.api.Test;

import formula.bollo.entity.Account;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class AccountDTOTest {
    private final JsonMapper mapper = JsonMapper.builder().build();

    @Test
    void dtoAndEntityToStringDoNotExposePasswordOrEmail() {
        AccountDTO dto = new AccountDTO(7L, "ana", "secreta123", 0, "a@b.com");
        Account entity = new Account(7L, "ana", "secreta123", 0, "a@b.com");

        for (String value : List.of(dto.toString(), entity.toString())) {
            assertFalse(value.contains("secreta123"));
            assertFalse(value.contains("a@b.com"));
        }
    }

    @Test
    void accountAndFantasyResponsesDoNotExposeSensitiveFields() {
        AccountDTO account = new AccountDTO(7L, "ana", "hash-secreto", 1, "ana@example.com");
        FantasyElectionDTO election = new FantasyElectionDTO();
        election.setAccount(account);
        FantasyClasificationEntryDTO points = new FantasyClasificationEntryDTO();
        points.setAccount(account);

        assertPublicAccount(mapper.readTree(mapper.writeValueAsString(account)));
        assertPublicAccount(mapper.readTree(mapper.writeValueAsString(election)).get("account"));
        JsonNode response = mapper.readTree(mapper.writeValueAsString(List.of(points))).get(0);
        assertPublicAccount(response.get("account"));
    }

    @Test
    void credentialsRemainDeserializable() {
        AccountDTO account = mapper.readValue("""
                {"id":7,"username":"ana","password":"secreto","email":"ana@example.com","admin":1}
                """, AccountDTO.class);

        assertEquals("secreto", account.getPassword());
        assertEquals("ana@example.com", account.getEmail());
        assertEquals(1, account.getAdmin());
    }

    private void assertPublicAccount(JsonNode account) {
        assertEquals(7L, account.get("id").asLong());
        assertEquals("ana", account.get("username").asString());
        assertFalse(account.has("password"));
        assertFalse(account.has("email"));
        assertFalse(account.has("admin"));
    }
}
