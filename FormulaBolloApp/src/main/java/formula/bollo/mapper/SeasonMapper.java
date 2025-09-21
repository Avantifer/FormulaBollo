package formula.bollo.mapper;

import java.util.List;

import org.mapstruct.Mapper;

import formula.bollo.entity.Season;
import formula.bollo.model.SeasonDTO;

@Mapper(componentModel = "spring")
public interface SeasonMapper {
    SeasonDTO seasonToSeasonDTO(Season season);

    Season seasonDTOToSeason(SeasonDTO season);
    
    List<SeasonDTO> convertSeasonsToSeasonsDTO(List<Season> seasons);
}
