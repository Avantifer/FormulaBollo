package formula.bollo.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import formula.bollo.entity.Season;
import formula.bollo.mapper.SeasonMapper;
import formula.bollo.model.SeasonDTO;

@Service
public class SeasonImpl {

    private final SeasonMapper seasonMapper;

    public SeasonImpl(SeasonMapper seasonMapper) {
        this.seasonMapper = seasonMapper;
    }

    public Season seasonDTOToSeason(SeasonDTO season) {
        return seasonMapper.seasonDTOToSeason(season);
    }

    public List<SeasonDTO> convertSeasonsToSeasonsDTO(List<Season> seasons) {
        return seasonMapper.convertSeasonsToSeasonsDTO(seasons);
    }

    public SeasonDTO seasonToSeasonDTO(Season season) {
        return seasonMapper.seasonToSeasonDTO(season);
    }
}
