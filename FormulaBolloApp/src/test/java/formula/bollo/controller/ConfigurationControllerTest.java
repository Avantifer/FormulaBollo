package formula.bollo.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import formula.bollo.entity.Configuration;
import formula.bollo.entity.Season;
import formula.bollo.impl.ConfigurationImpl;
import formula.bollo.mapper.ConfigurationMapper;
import formula.bollo.repository.ConfigurationRepository;

class ConfigurationControllerTest {
    @Test
    void requestedSeasonUsesFilteredRepositoryAndPreservesJson() throws Exception {
        ConfigurationRepository configurations = mock(ConfigurationRepository.class);
        when(configurations.findBySeason(2)).thenReturn(List.of(configuration()));
        MockMvc mvc = mvc(configurations);

        mvc.perform(get("/configurations/all").param("season", "2"))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        [{"id":7,"setting":"Qualifying","settingValue":"Short"}]
                        """, JsonCompareMode.STRICT));

        verify(configurations).findBySeason(2);
        verify(configurations, never()).findAll();
        verifyNoMoreInteractions(configurations);
    }

    @Test
    void omittedSeasonUsesFindAll() throws Exception {
        ConfigurationRepository configurations = mock(ConfigurationRepository.class);
        when(configurations.findAll()).thenReturn(List.of(configuration()));
        MockMvc mvc = mvc(configurations);

        mvc.perform(get("/configurations/all"))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        [{"id":7,"setting":"Qualifying","settingValue":"Short"}]
                        """, JsonCompareMode.STRICT));

        verify(configurations).findAll();
        verify(configurations, never()).findBySeason(anyInt());
        verifyNoMoreInteractions(configurations);
    }

    private MockMvc mvc(ConfigurationRepository configurations) {
        ConfigurationImpl mapper = new ConfigurationImpl(Mappers.getMapper(ConfigurationMapper.class));
        return MockMvcBuilders.standaloneSetup(new ConfigurationController(configurations, mapper)).build();
    }

    private Configuration configuration() {
        Configuration configuration = new Configuration();
        configuration.setId(7L);
        configuration.setSetting("Qualifying");
        configuration.setSettingValue("Short");
        configuration.setSeason(new Season(42L, "Season 2", 2, 2026));
        return configuration;
    }
}
