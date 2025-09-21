package formula.bollo.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import formula.bollo.entity.Result;
import formula.bollo.mapper.ResultMapper;
import formula.bollo.model.ResultDTO;

@Service
public class ResultImpl {
    
    private ResultMapper resultMapper;

    public ResultImpl(ResultMapper resultMapper) {
        this.resultMapper = resultMapper;
    }

    public List<ResultDTO> convertResultsToResultsDTO(List<Result> results) {
        return this.resultMapper.convertResultsToResultsDTO(results);
    }

    public List<Result> convertResultsDTOToResults(List<ResultDTO> resultsDTO) {
        return this.resultMapper.convertResultsDTOToResults(resultsDTO);
    }

}
