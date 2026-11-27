package formula.bollo.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertAll;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.mapstruct.factory.Mappers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import formula.bollo.entity.Driver;
import formula.bollo.entity.Penalty;
import formula.bollo.entity.PenaltySeverity;
import formula.bollo.entity.Race;
import formula.bollo.entity.Season;
import formula.bollo.entity.Team;
import formula.bollo.impl.PenaltyImpl;
import formula.bollo.mapper.PenaltyMapper;
import formula.bollo.repository.PenaltyRepository;
import formula.bollo.service.PenaltyService;
import formula.bollo.utils.Constants;
import jakarta.persistence.EntityManager;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:penalty-controller;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.sql.init.mode=never"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({PenaltyController.class, PenaltyService.class, PenaltyImpl.class, PenaltyControllerJpaTest.MappersConfig.class})
@Execution(ExecutionMode.SAME_THREAD)
class PenaltyControllerJpaTest {
    @TestConfiguration
    static class MappersConfig {
        @Bean PenaltyMapper penaltyMapper() { return Mappers.getMapper(PenaltyMapper.class); }
    }

    @Autowired EntityManager em;
    @Autowired PenaltyController controller;
    @Autowired PenaltyRepository penalties;

    private MockMvc mvc;
    private Driver driver;
    private Race race;
    private PenaltySeverity severityB;
    private Penalty penaltyA;
    private Penalty penaltyB;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.standaloneSetup(controller).build();
        Season season = persist(new Season(null, "Season", Constants.ACTUAL_SEASON, 2026));
        Team team = persist(new Team(null, "Team", "", "", season));
        driver = persist(new Driver(null, "Ana", 1, "", season, team));
        race = persist(new Race(null, "GP", "", "", LocalDateTime.of(2026, 1, 1, 12, 0), season, 1));
        PenaltySeverity severityA = persist(new PenaltySeverity(null, "Leve"));
        severityB = persist(new PenaltySeverity(null, "Grave"));
        penaltyA = persist(new Penalty(null, race, driver, "Reason A", severityA, season));
        penaltyB = persist(new Penalty(null, race, driver, "Reason B", severityB, season));
        em.flush();
        em.clear();
    }

    @Test
    void emptyBodyDeletesOnlyTheRequestedSeverity() throws Exception {
        mvc.perform(put("/penalties/save")
                .param("driverId", driver.getId().toString())
                .param("raceId", race.getId().toString())
                .param("severityId", severityB.getId().toString())
                .contentType("application/json").content("[]"))
                .andExpect(status().isOk());

        em.flush();
        em.clear();
        List<Penalty> saved = penalties.findByRaceId(race.getId());
        assertThat(saved).extracting(Penalty::getId).containsExactly(penaltyA.getId());
        assertThat(penalties.findById(penaltyB.getId())).isEmpty();
    }

    @Test
    void emptyBodyWithoutSeverityIsRejectedWithoutDeletingPenalties() throws Exception {
        int responseStatus = mvc.perform(put("/penalties/save")
                .param("driverId", driver.getId().toString())
                .param("raceId", race.getId().toString())
                .contentType("application/json").content("[]"))
                .andReturn().getResponse().getStatus();

        em.flush();
        em.clear();
        List<Penalty> saved = penalties.findByRaceId(race.getId());
        assertAll(
                () -> assertThat(responseStatus).isEqualTo(400),
                () -> assertThat(saved).extracting(Penalty::getId)
                        .containsExactlyInAnyOrder(penaltyA.getId(), penaltyB.getId()));
    }

    private <T> T persist(T entity) {
        em.persist(entity);
        return entity;
    }
}
