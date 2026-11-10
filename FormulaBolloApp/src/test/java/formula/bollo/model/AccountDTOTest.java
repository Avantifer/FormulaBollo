package formula.bollo.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.List;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class AccountDTOTest {
    private final JsonMapper mapper = JsonMapper.builder().build();

    @Test
    void accountAndFantasyResponsesDoNotExposeSensitiveFields() {
        AccountDTO account = new AccountDTO(7L, "ana", "hash-secreto", 1, "ana@example.com");
        FantasyElectionDTO election = new FantasyElectionDTO();
        election.setAccount(account);
        FantasyPointsAccountDTO points = new FantasyPointsAccountDTO();
        points.setAccount(account);
        points.setFantasyElection(election);

        assertPublicAccount(mapper.readTree(mapper.writeValueAsString(account)));
        assertPublicAccount(mapper.readTree(mapper.writeValueAsString(election)).get("account"));
        JsonNode response = mapper.readTree(mapper.writeValueAsString(List.of(points))).get(0);
        assertPublicAccount(response.get("account"));
        assertPublicAccount(response.get("fantasyElection").get("account"));
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
