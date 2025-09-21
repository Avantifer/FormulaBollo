package formula.bollo.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import formula.bollo.entity.Race;
import formula.bollo.mapper.RaceMapper;
import formula.bollo.model.RaceDTO;

@Service
public class RaceImpl {
    
    private RaceMapper raceMapper;

    public RaceImpl(RaceMapper raceMapper) {
        this.raceMapper = raceMapper;
    }
    
    public Race raceDTOToRace(RaceDTO raceDTO) {
        return raceMapper.raceDTOToRace(raceDTO);
    }

    public RaceDTO raceToRaceDTO(Race race) {
        return raceMapper.raceToRaceDTO(race);
    }

    public List<RaceDTO> convertRacesToRacesDTO(List<Race> races) {
        return raceMapper.convertRacesToRacesDTO(races);
    }
}
