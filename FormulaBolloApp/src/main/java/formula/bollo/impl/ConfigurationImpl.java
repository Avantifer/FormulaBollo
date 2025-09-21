package formula.bollo.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import formula.bollo.entity.Configuration;
import formula.bollo.mapper.ConfigurationMapper;
import formula.bollo.model.ConfigurationDTO;

@Service
public class ConfigurationImpl {
    
    private final ConfigurationMapper configurationMapper;

    public ConfigurationImpl(ConfigurationMapper configurationMapper) {
        this.configurationMapper = configurationMapper;
    } 

    public List<ConfigurationDTO> convertConfigurationsToConfigurationsDTO(List<Configuration> configurations) {
        return configurationMapper.convertConfigurationsToConfigurationsDTO(configurations);
    }
}
