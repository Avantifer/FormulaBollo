package formula.bollo.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import formula.bollo.impl.FantasyPointsImpl;
import formula.bollo.impl.FantasyPriceImpl;
import formula.bollo.model.AccountDTO;
import formula.bollo.model.FantasyElectionDTO;
import formula.bollo.repository.FantasyPointsDriverRepository;
import formula.bollo.repository.FantasyPointsTeamRepository;
import formula.bollo.repository.FantasyPriceDriverRepository;
import formula.bollo.repository.FantasyPriceTeamRepository;
import formula.bollo.service.FantasyService;

@ExtendWith(MockitoExtension.class)
class FantasyControllerTest {

    @InjectMocks
    private FantasyController fantasyController;

    @Mock
    private FantasyPointsDriverRepository fantasyPointsDriverRepository;

    @Mock
    private FantasyPriceDriverRepository fantasyPriceDriverRepository;

    @Mock
    private FantasyPriceTeamRepository fantasyPriceTeamRepository;

    @Mock
    private FantasyPointsTeamRepository fantasyPointsTeamRepository;

    @Mock
    private FantasyPriceImpl fantasyPriceImpl;

    @Mock
    private FantasyPointsImpl fantasyPointsImpl;

    @Mock
    private FantasyService fantasyService;

    private FantasyElectionDTO electionOf(String username) {
        FantasyElectionDTO election = new FantasyElectionDTO();
        election.setAccount(new AccountDTO(1L, username, null, 0, null));
        return election;
    }

    @Test
    void saveFantasyElectionWithoutTokenIsRejected() {
        ResponseEntity<String> response = fantasyController.saveFantasyElection(electionOf("ana"), null);

        assertEquals(403, response.getStatusCode().value());
        verifyNoInteractions(fantasyService);
    }

    @Test
    void saveFantasyElectionUsesPrincipalInsteadOfClientOwner() {
        FantasyElectionDTO election = electionOf("ana");
        when(fantasyService.saveFantasyElection(election, "bob")).thenReturn(ResponseEntity.ok("ok"));
        ResponseEntity<String> response = fantasyController.saveFantasyElection(election, () -> "bob");

        assertEquals(200, response.getStatusCode().value());
        verify(fantasyService).saveFantasyElection(election, "bob");
    }

    @Test
    void saveFantasyElectionOfTheOwnUserIsAllowed() {
        FantasyElectionDTO election = electionOf("ana");
        election.setId(99L);
        election.getAccount().setId(35L);
        when(fantasyService.saveFantasyElection(election, "ana")).thenReturn(ResponseEntity.ok("ok"));

        ResponseEntity<String> response = fantasyController.saveFantasyElection(election, () -> "ana");

        assertEquals(200, response.getStatusCode().value());
        verify(fantasyService).saveFantasyElection(election, "ana");
    }
}
