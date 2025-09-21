package formula.bollo.controller;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;

import formula.bollo.impl.ConfigurationImpl;
import formula.bollo.model.ConfigurationDTO;
import formula.bollo.repository.ConfigurationRepository;
import formula.bollo.utils.Constants;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping(path = { Constants.ENDPOINT_CONFIGURATION })
@Tag(name = Constants.TAG_CONFIGURATION, description = Constants.TAG_CONFIGURATION_SUMMARY)
public class ConfigurationController {

    private final ConfigurationRepository configurationRepository;
    private final ConfigurationImpl configurationImpl;

    public ConfigurationController(ConfigurationRepository configurationRepository,
            ConfigurationImpl configurationImpl) {
        this.configurationRepository = configurationRepository;
        this.configurationImpl = configurationImpl;
    }

    @Operation(summary = "Get all configurations", tags = Constants.TAG_CONFIGURATION)
    @GetMapping(path = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<ConfigurationDTO> getAllConfigurations() {
        log.info("Se coge todas las configuraciones");
        return configurationImpl.convertConfigurationsToConfigurationsDTO(configurationRepository.findAll());
    }
}
