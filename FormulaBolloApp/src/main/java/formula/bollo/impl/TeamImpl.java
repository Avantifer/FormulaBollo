package formula.bollo.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import formula.bollo.entity.Team;
import formula.bollo.mapper.TeamMapper;
import formula.bollo.model.TeamDTO;

@Service
public class TeamImpl {

    private final TeamMapper teamMapper;

    public TeamImpl(TeamMapper teamMapper) {
        this.teamMapper = teamMapper;
    }

    public List<TeamDTO> convertTeamsToTeamsDTO(List<Team> teams) {
        return teamMapper.convertTeamsToTeamsDTO(teams);
    }

    public TeamDTO teamToTeamDTO(Team team) {
        return this.teamMapper.teamToTeamDTO(team);
    }

    public Team teamDTOToTeam(TeamDTO team) {
        return this.teamMapper.teamDTOToTeam(team);
    }
}
