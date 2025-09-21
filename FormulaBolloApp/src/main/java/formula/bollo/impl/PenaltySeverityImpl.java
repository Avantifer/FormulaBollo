package formula.bollo.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import formula.bollo.entity.PenaltySeverity;
import formula.bollo.mapper.PenaltySeverityMapper;
import formula.bollo.model.PenaltySeverityDTO;

@Service
public class PenaltySeverityImpl {
    
    private PenaltySeverityMapper penaltySeverityMapper;

    public PenaltySeverityImpl(PenaltySeverityMapper penaltySeverityMapper) {
        this.penaltySeverityMapper = penaltySeverityMapper;
    }

    public List<PenaltySeverityDTO> convertPenaltySeveritiesToPenaltySeverityDTO(List<PenaltySeverity> penaltySeverities) {
        return this.penaltySeverityMapper.convertPenaltySeveritiesToPenaltySeverityDTO(penaltySeverities);
    }
}
