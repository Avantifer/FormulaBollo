package formula.bollo.mapper;

import java.util.List;

import org.mapstruct.Mapper;

import formula.bollo.entity.Result;
import formula.bollo.model.ResultDTO;

@Mapper(componentModel = "spring")
public interface ResultMapper {
    List<Result> convertResultsDTOToResults(List<ResultDTO> resultsDTO);

    List<ResultDTO> convertResultsToResultsDTO(List<Result> results);
}
