package formula.bollo.mapper;

import org.mapstruct.Mapper;

import formula.bollo.entity.FantasyElection;
import formula.bollo.model.FantasyElectionDTO;

@Mapper(componentModel = "spring")
public interface FantasyElectionMapper {
    public FantasyElection fantasyElectionDTOToFantasyElection(FantasyElectionDTO fantasyElectionDTO);

    public FantasyElectionDTO fantasyElectionToFantasyElectionDTO(FantasyElection fantasyElection);
}
