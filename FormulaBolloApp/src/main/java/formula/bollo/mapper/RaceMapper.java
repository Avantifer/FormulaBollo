package formula.bollo.mapper;

import java.util.List;

import org.mapstruct.Mapper;

import formula.bollo.entity.Race;
import formula.bollo.model.RaceDTO;

@Mapper(componentModel = "spring")
public interface RaceMapper {
    Race raceDTOToRace(RaceDTO raceDTO);

    RaceDTO raceToRaceDTO(Race race);

    List<RaceDTO> convertRacesToRacesDTO(List<Race> races);
}
