package formula.bollo.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import formula.bollo.entity.FantasyPriceDriver;
import formula.bollo.entity.FantasyPriceTeam;
import formula.bollo.model.FantasyPriceDriverDTO;
import formula.bollo.model.FantasyPriceTeamDTO;

@Mapper(componentModel = "spring")
public interface FantasyPriceMapper {
    @Mapping(target = "fantasyInfo", expression = "java(new formula.bollo.model.FantasyInfoDTO())")
    FantasyPriceDriverDTO fantasyPriceDriverToFantasyPriceDriverDTO(FantasyPriceDriver fantasyPrice);

    List<FantasyPriceDriverDTO> convertFantasyPriceDriverToFantasyPriceDriverDTO(
            List<FantasyPriceDriver> fantasyPrices);

    @Mapping(target = "fantasyInfo", expression = "java(new formula.bollo.model.FantasyInfoDTO())")
    FantasyPriceTeamDTO fantasyPriceTeamToFantasyPriceTeamDTO(FantasyPriceTeam fantasyPrice);

    List<FantasyPriceTeamDTO> convertFantasyPriceTeamToFantasyPriceTeamDTO(List<FantasyPriceTeam> fantasyPrices);
}
