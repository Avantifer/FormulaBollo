package formula.bollo.mapper;

import java.util.List;

import org.mapstruct.Mapper;

import formula.bollo.entity.Team;
import formula.bollo.model.TeamDTO;

@Mapper(componentModel = "spring")
public interface TeamMapper {

    TeamDTO teamToTeamDTO(Team team);

    Team teamDTOToTeam(TeamDTO team);

    List<TeamDTO> convertTeamsToTeamsDTO(List<Team> teams);
}
