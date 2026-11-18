package formula.bollo.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import formula.bollo.impl.ConfigurationImpl;
import formula.bollo.mapper.ConfigurationMapper;
import jakarta.persistence.EntityManager;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:configuration-controller;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({ ConfigurationController.class, ConfigurationImpl.class, ConfigurationControllerTest.Config.class })
class ConfigurationControllerTest {
    private static final String ALL_CONFIGURATIONS = """
            [
                {"id":10,"setting":"first","settingValue":"10"},
                {"id":20,"setting":"second","settingValue":null},
                {"id":30,"setting":"third","settingValue":"30"}
            ]
            """;

    @Autowired EntityManager em;
    @Autowired ConfigurationController controller;

    MockMvc mvc;

    @BeforeEach
    void setUp() {
        em.createNativeQuery("""
                INSERT INTO configuration (id, setting, setting_value) VALUES
                (30, 'third', '30'), (10, 'first', '10'), (20, 'second', NULL)
                """).executeUpdate();
        em.clear();
        mvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void getAllReturnsAllGlobalConfigurationsOrderedById() throws Exception {
        mvc.perform(get("/configurations/all"))
                .andExpect(status().isOk())
                .andExpect(content().json(ALL_CONFIGURATIONS, JsonCompareMode.STRICT));
    }

    @Test
    void getAllIgnoresSeasonAndReturnsAllGlobalConfigurationsOrderedById() throws Exception {
        mvc.perform(get("/configurations/all").param("season", "3"))
                .andExpect(status().isOk())
                .andExpect(content().json(ALL_CONFIGURATIONS, JsonCompareMode.STRICT));
    }

    @TestConfiguration
    static class Config {
        @Bean
        ConfigurationMapper configurationMapper() {
            return Mappers.getMapper(ConfigurationMapper.class);
        }
    }
}
