package formula.bollo.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import formula.bollo.entity.FantasyPriceDriver;
import formula.bollo.entity.FantasyPriceTeam;
import formula.bollo.mapper.FantasyPriceMapper;
import formula.bollo.model.FantasyPriceDriverDTO;
import formula.bollo.model.FantasyPriceTeamDTO;

@Service
public class FantasyPriceImpl {
    private FantasyPriceMapper fantasyPriceMapper;

    public FantasyPriceImpl(FantasyPriceMapper fantasyPriceMapper) {
        this.fantasyPriceMapper = fantasyPriceMapper;
    }

    public FantasyPriceDriverDTO fantasyPriceDriverToFantasyPriceDriverDTO(FantasyPriceDriver fantasyPrice) {
        return this.fantasyPriceMapper.fantasyPriceDriverToFantasyPriceDriverDTO(fantasyPrice);
    }

    public List<FantasyPriceDriverDTO> convertFantasyPriceDriverToFantasyPriceDriverDTO(
            List<FantasyPriceDriver> fantasyPrices) {
        return this.fantasyPriceMapper.convertFantasyPriceDriverToFantasyPriceDriverDTO(fantasyPrices);
    }

    public FantasyPriceTeamDTO fantasyPriceTeamToFantasyPriceTeamDTO(FantasyPriceTeam fantasyPrice) {
        return this.fantasyPriceMapper.fantasyPriceTeamToFantasyPriceTeamDTO(fantasyPrice);
    }

    public List<FantasyPriceTeamDTO> convertFantasyPriceTeamToFantasyPriceTeamDTO(
            List<FantasyPriceTeam> fantasyPrices) {
        return this.fantasyPriceMapper.convertFantasyPriceTeamToFantasyPriceTeamDTO(fantasyPrices);
    }
}
