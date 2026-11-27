package formula.bollo.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import formula.bollo.entity.Race;
import formula.bollo.entity.Season;
import formula.bollo.repository.RaceRepository;
import jakarta.persistence.EntityManager;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:race-madrid-http;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.sql.init.mode=never",
    "jwt.secret=madrid-race-http-test-secret-at-least-32-bytes",
    "spring.mail.host=localhost", "spring.mail.username=race-test@example.com"
})
@AutoConfigureMockMvc(addFilters = false)
@Transactional
@Execution(ExecutionMode.SAME_THREAD)
class RaceMadridTimeHttpTest {
    @Autowired RaceRepository races;
    @Autowired EntityManager em;
    // Use Boot's mapper, including application.properties and any application customizers.
    @Autowired JsonMapper json;
    @Autowired MockMvc mvc;
    private Race race;

    @BeforeEach
    void setup() {
        Season season = new Season(null, "Season", 1, 2025);
        em.persist(season);
        race = new Race(null, "GP", "flag", "circuit",
                LocalDateTime.of(2025, 1, 1, 21, 0), season, 0);
        em.persist(race);
        em.flush();
    }

    @ParameterizedTest(name = "HTTP {0} must store and return Madrid {1}")
    @CsvSource({
        "2025-10-05T19:00:00Z, 2025-10-05T21:00:00",
        "2025-01-05T20:00:00Z, 2025-01-05T21:00:00",
        "2025-10-04T22:30:00Z, 2025-10-05T00:30:00",
        "2025-07-06T21:00:00+02:00, 2025-07-06T21:00:00",
        "2025-01-05T21:00:00+02:00, 2025-01-05T20:00:00",
        "2025-10-05T21:00:00, 2025-10-05T21:00:00",
        "2025-01-05T21:00:00, 2025-01-05T21:00:00",
        "2025-10-05T00:30:00, 2025-10-05T00:30:00"
    })
    void saveConvertsLegacyInstantsAndRoundTripsZonelessTimes(String sent, String expected) throws Exception {
        save(sent);
        assertStoredAndReturned(expected);
        // A current tab saves the zoneless value returned by the API again.
        String response = mvc.perform(get("/races/all").param("season", "1"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        save(json.readTree(response).get(0).get("dateStart").asString());
        assertStoredAndReturned(expected);
    }

    private void save(String date) throws Exception {
        // Literal wire JSON: serializing a LocalDateTime here would hide legacy Z/offset inputs.
        mvc.perform(put("/races/save").contentType("application/json").content("""
                {"id":%d,"name":"GP","flagImage":"flag","circuitImage":"circuit",
                 "dateStart":"%s","season":{"number":1},"finished":1}
                """.formatted(race.getId(), date))).andExpect(status().isOk());
        em.flush();
        em.clear();
    }

    private void assertStoredAndReturned(String expected) {
        assertAll(
                () -> assertThat(races.findById(race.getId()).orElseThrow().getDateStart())
                        .isEqualTo(LocalDateTime.parse(expected)),
                () -> mvc.perform(get("/races/all").param("season", "1"))
                        .andExpect(status().isOk()).andExpect(jsonPath("$[0].dateStart").value(expected)));
    }
}
