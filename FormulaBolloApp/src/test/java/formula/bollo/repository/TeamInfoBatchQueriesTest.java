package formula.bollo.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mapstruct.factory.Mappers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import formula.bollo.entity.*;
import formula.bollo.impl.*;
import formula.bollo.mapper.*;
import formula.bollo.model.TeamInfoDTO;
import formula.bollo.service.DriverService;
import formula.bollo.service.ResultService;
import formula.bollo.service.TeamService;
import jakarta.persistence.EntityManager;
import tools.jackson.databind.json.JsonMapper;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:team-info-batch;MODE=MariaDB;DB_CLOSE_DELAY=-1;NON_KEYWORDS=YEAR",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.generate_statistics=true",
        "spring.sql.init.mode=never"
}, showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Execution(ExecutionMode.SAME_THREAD)
class TeamInfoBatchQueriesTest {
    @Autowired EntityManager em;
    @Autowired TeamRepository teams;
    @Autowired DriverRepository drivers;
    @Autowired ConstructorRepository constructors;
    @Autowired ResultRepository results;
    @Autowired SprintRepository sprints;
    @Autowired PenaltyRepository penalties;
    @Autowired ChampionshipRepository championships;

    TeamService service;
    final JsonMapper json = JsonMapper.builder().findAndAddModules().build();

    @BeforeEach
    void createServicesWithRealCalculatorsAndMappers() {
        TeamImpl teamMapper = new TeamImpl(Mappers.getMapper(TeamMapper.class));
        DriverImpl driverMapper = new DriverImpl(Mappers.getMapper(DriverMapper.class));
        ResultImpl resultMapper = new ResultImpl(Mappers.getMapper(ResultMapper.class));
        DriverService driverService = new DriverService(results, championships, penalties, sprints,
                driverMapper, resultMapper,
                new ResultService(results, sprints, resultMapper, driverMapper));
        service = new TeamService(results, sprints, drivers, constructors, teams, teamMapper,
                driverMapper, resultMapper, driverService);
    }

    @Test
    void bulkQueriesFilterCountsAndFetchRelationsIncludingNullPositions() {
        List<Team> seeded = seedSeason(1, 5);
        List<Long> ids = List.of(seeded.get(0).getId(), seeded.get(1).getId(), seeded.get(3).getId());
        seedSeason(2, 5); // same names, excluded by team ids
        em.flush();
        em.clear();

        assertThat(teams.findWithSeasonByIdIn(ids)).hasSize(3).allSatisfy(team -> assertLoaded(team, "season"));
        List<Driver> loaded = drivers.findByTeamIdIn(ids);
        assertThat(loaded).hasSize(5).allSatisfy(driver -> {
            assertThat(ids).contains(driver.getTeam().getId());
            assertLoaded(driver, "season");
            assertLoaded(driver, "team");
        });
        assertThat(constructors.countByTeam(ids)).singleElement().satisfies(row -> {
            assertThat(row[0]).isEqualTo(seeded.getFirst().getId());
            assertThat(((Number) row[1]).intValue()).isEqualTo(2);
        });
        List<Long> driverIds = loaded.stream().map(Driver::getId).toList();
        List<Result> loadedResults = results.findForTeamInfoByDriverIds(driverIds);
        assertThat(loadedResults).hasSize(5).anyMatch(result -> result.getPosition() == null)
                .allSatisfy(result -> {
                    assertThat(driverIds).contains(result.getDriver().getId());
                    assertLoaded(result, "race");
                    assertLoaded(result.getRace(), "season");
                    assertLoaded(result, "position");
                });
        assertThat(sprints.findWithPositionByDriverIds(driverIds)).hasSize(5)
                .anyMatch(sprint -> sprint.getPosition() == null).allSatisfy(sprint -> {
                    assertThat(driverIds).contains(sprint.getDriver().getId());
                    assertLoaded(sprint, "position");
                });
    }

    @ParameterizedTest
    @ValueSource(ints = { 0, 1, 2, 3 })
    void serviceJsonMatchesOldSingletonPathForEverySeason(int season) {
        for (int number = 1; number <= 3; number++)
            seedSeason(number, 5);
        em.flush();
        em.clear();
        List<Team> ordered = season == 0 ? teams.findAll() : teams.findBySeason(season);
        List<TeamInfoDTO> expected = service.sumDuplicates(ordered.stream()
                .map(team -> service.getAllInfoTeam(List.of(team))).toList());
        String expectedJson = json.writeValueAsString(expected);
        em.clear();

        List<Team> actualTeams = season == 0 ? teams.findAll() : teams.findBySeason(season);
        assertThat(json.writeValueAsString(service.sumDuplicates(service.getAllInfoTeams(actualTeams))))
                .isEqualTo(expectedJson);
    }

    @ParameterizedTest
    @ValueSource(ints = { 1, 5 })
    void serviceExecutesEightSelectsRegardlessOfTeamCount(int teamCount) {
        seedSeason(1, teamCount);
        em.flush();
        em.clear();
        Statistics statistics = em.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();
        statistics.clear();

        List<TeamInfoDTO> response = service.sumDuplicates(service.getAllInfoTeams(teams.findBySeason(1)));
        json.writeValueAsString(response);

        assertThat(response).hasSize(teamCount);
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(8);
        System.out.println("getAllInfoTeams: " + teamCount + " teams, " + statistics.getPrepareStatementCount() + " SELECTs");
    }

    @Test
    void lastResultsMatchRealLegacyQueryWithDateTiesAndFifteenRowCutoff() {
        Team team = seedSeason(1, 1).getFirst();
        List<Driver> teamDrivers = drivers.findByTeamId(team.getId());
        Position winner = em.createQuery("SELECT p FROM Position p", Position.class).getResultList().getFirst();
        for (int number = 0; number < 8; number++) {
            Race race = persist(new Race(null, "Race " + number, "", "",
                    LocalDateTime.of(2026, 2, 1, 0, 0).plusDays(number / 2), team.getSeason(), 1));
            for (int index = 0; index < teamDrivers.size(); index++)
                persist(new Result(null, race, teamDrivers.get(index),
                        number == 7 || index != 0 ? null : winner, 1, 1));
        }
        em.flush();
        em.clear();
        Team managed = teams.findById(team.getId()).orElseThrow();
        TeamInfoDTO expected = service.getAllInfoTeam(List.of(managed));
        String expectedJson = json.writeValueAsString(expected);
        em.clear();

        TeamInfoDTO actual = service.getAllInfoTeams(List.of(teams.findById(team.getId()).orElseThrow())).getFirst();

        assertThat(json.writeValueAsString(actual)).isEqualTo(expectedJson);
        assertThat(actual.getLast5Results()).hasSize(4);
        assertThat(actual.getLast5Results().stream().mapToInt(race -> race.getResults().size()).sum()).isEqualTo(15);
        assertThat(actual.getLast5Results()).noneMatch(race -> race.getRace().getName().equals("Race 7"));
    }

    private List<Team> seedSeason(int number, int teamCount) {
        Season season = persist(new Season(null, "Season " + number, number, 2024 + number));
        Race race = persist(new Race(null, "Race", "", "", LocalDateTime.of(2026, number, 1, 0, 0), season, 1));
        Position position = persist(new Position(null, 3, 15));
        SprintPosition sprintPosition = persist(new SprintPosition(null, 2, 6));
        PenaltySeverity severity = persist(new PenaltySeverity(null, "Low"));
        List<Team> seeded = new ArrayList<>();
        for (int kind = 0; kind < teamCount; kind++) {
            Team team = persist(new Team(null, "Team " + kind, "car", "logo", season));
            seeded.add(team);
            if (kind == 0) {
                for (int count = 0; count < 2; count++) {
                    Constructor constructor = new Constructor();
                    constructor.setTeam(team);
                    persist(constructor);
                }
            }
            if (kind == 3)
                continue; // team without drivers
            for (int index = 0; index < (kind == 0 ? 4 : 1); index++) {
                Driver driver = persist(new Driver(null, "Driver " + index, index, "", season, team));
                if (kind == 2)
                    continue; // driver without results or sprints
                persist(new Result(null, race, driver, kind == 1 || index == 1 ? null : position, 1, 1));
                persist(new Sprint(null, race, driver, index == 1 ? null : sprintPosition));
                persist(new Penalty(null, race, driver, "Penalty", severity, season));
                Championship championship = new Championship();
                championship.setDriver(driver);
                persist(championship);
            }
        }
        return seeded;
    }

    private void assertLoaded(Object entity, String attribute) {
        assertThat(em.getEntityManagerFactory().getPersistenceUnitUtil().isLoaded(entity, attribute)).isTrue();
    }

    private <T> T persist(T entity) {
        em.persist(entity);
        return entity;
    }
}
