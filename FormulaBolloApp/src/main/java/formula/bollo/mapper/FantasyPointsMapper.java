package formula.bollo.mapper;

import java.util.List;

import org.mapstruct.Mapper;

import formula.bollo.entity.FantasyPointsDriver;
import formula.bollo.entity.FantasyPointsTeam;
import formula.bollo.model.FantasyPointsDriverDTO;
import formula.bollo.model.FantasyPointsTeamDTO;

@Mapper(componentModel = "spring")
public interface FantasyPointsMapper {
    FantasyPointsDriverDTO fantasyPointsDriverToFantasyPointsDriverDTO(FantasyPointsDriver fantasyPointsDriver);

    List<FantasyPointsDriverDTO> convertFantasyPointsDriverToFantasyPointsDriverDTO(List<FantasyPointsDriver> fantasyPointsDrivers);

    FantasyPointsTeamDTO fantasyPointsTeamToFantasyPointsTeamDTO(FantasyPointsTeam fantasyPointsTeam);

    List<FantasyPointsTeamDTO> convertFantasyPointsTeamToFantasyPointsTeamDTO(List<FantasyPointsTeam> fantasyPointsTeams);
}
