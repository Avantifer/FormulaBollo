package formula.bollo.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import formula.bollo.entity.FantasyPointsDriver;
import formula.bollo.entity.FantasyPointsTeam;
import formula.bollo.mapper.FantasyPointsMapper;
import formula.bollo.model.FantasyPointsDriverDTO;
import formula.bollo.model.FantasyPointsTeamDTO;

@Service
public class FantasyPointsImpl {
    private FantasyPointsMapper fantasyPointsMapper;

    public FantasyPointsImpl(FantasyPointsMapper fantasyPointsMapper) {
        this.fantasyPointsMapper = fantasyPointsMapper;
    }

    public FantasyPointsDriverDTO fantasyPointsDriverToFantasyPointsDriverDTO(FantasyPointsDriver fantasyPointsDriver) {
        return this.fantasyPointsMapper.fantasyPointsDriverToFantasyPointsDriverDTO(fantasyPointsDriver);
    }

    public List<FantasyPointsDriverDTO> convertFantasyPointsDriverToFantasyPointsDriverDTO(List<FantasyPointsDriver> fantasyPointsDrivers) {
        return this.fantasyPointsMapper.convertFantasyPointsDriverToFantasyPointsDriverDTO(fantasyPointsDrivers);
    }

    public FantasyPointsTeamDTO fantasyPointsTeamToFantasyPointsTeamDTO(FantasyPointsTeam fantasyPointsTeam) {
        return this.fantasyPointsMapper.fantasyPointsTeamToFantasyPointsTeamDTO(fantasyPointsTeam);
    }

    public List<FantasyPointsTeamDTO> convertFantasyPointsTeamToFantasyPointsTeamDTO(List<FantasyPointsTeam> fantasyPointsTeams) {
        return this.fantasyPointsMapper.convertFantasyPointsTeamToFantasyPointsTeamDTO(fantasyPointsTeams);
    }
}
