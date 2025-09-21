package formula.bollo.mapper;

import java.util.List;

import org.mapstruct.Mapper;

import formula.bollo.entity.Configuration;
import formula.bollo.model.ConfigurationDTO;

@Mapper(componentModel = "spring")
public interface ConfigurationMapper {
    List<ConfigurationDTO> convertConfigurationsToConfigurationsDTO(List<Configuration> configurations);
}
