package formula.bollo.impl;

import org.springframework.stereotype.Service;

import formula.bollo.entity.FantasyElection;
import formula.bollo.mapper.FantasyElectionMapper;
import formula.bollo.model.FantasyElectionDTO;

@Service
public class FantasyElectionImpl {
    private FantasyElectionMapper fantasyElectionMapper;

    public FantasyElectionImpl(FantasyElectionMapper fantasyElectionMapper) {
        this.fantasyElectionMapper = fantasyElectionMapper;
    }
    
    public FantasyElection fantasyElectionDTOToFantasyElection(FantasyElectionDTO fantasyElectionDTO) {
        return this.fantasyElectionMapper.fantasyElectionDTOToFantasyElection(fantasyElectionDTO);
    }

    public FantasyElectionDTO fantasyElectionToFantasyElectionDTO(FantasyElection fantasyElection) {
        return this.fantasyElectionMapper.fantasyElectionToFantasyElectionDTO(fantasyElection);
    }
}
