package formula.bollo.utils;


import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

public class Constants {

    private Constants() {
    }

    // Tags
    public static final String TAG_ACCOUNT = "Account";
    public static final String TAG_ACCOUNT_SUMMARY = "Operations related with accounts";

    public static final String TAG_ARCHIVE = "Archives";
    public static final String TAG_ARCHIVE_SUMMARY = "Operations related with files";

    public static final String TAG_CIRCUIT = "Circuits";
    public static final String TAG_CIRCUIT_SUMMARY = "Operations related with circuits";

    public static final String TAG_CONFIGURATION = "Configurations";
    public static final String TAG_CONFIGURATION_SUMMARY = "Operations related with Configurations";

    public static final String TAG_DRIVER = "Drivers";
    public static final String TAG_DRIVER_SUMMARY = "Operations related with drivers";

    public static final String TAG_STATISTICS = "Statistics";
    public static final String TAG_STATISTICS_SUMMARY = "Operations related with statistics";
    public static final String STATISTICS_OVERVIEW_SUMMARY = "Get statistics overview";
    public static final String STATISTICS_RECORDS_SUMMARY = "Get statistics records by person and season";
    public static final String STATISTICS_HEAD_TO_HEAD_SUMMARY = "Get driver head to head statistics";

    public static final String TAG_PENALTY = "Penalties";
    public static final String TAG_PENALTY_SUMMARY = "Operations related with penalties";

    public static final String TAG_PENALTY_SEVERITY = "PenaltiesSeverity";
    public static final String TAG_PENALTY_SEVERITY_SUMMARY = "Operations related with the severity of penalties";

    public static final String TAG_RACE = "Races";
    public static final String TAG_RACE_SUMMARY = "Operations related with races";

    public static final String TAG_RESULT = "Results";
    public static final String TAG_RESULT_SUMMARY = "Operations related with results";

    public static final String TAG_TEAM = "Teams";
    public static final String TAG_TEAM_SUMMARY = "Operations related with teams";

    public static final String TAG_SEASON = "Seasons";
    public static final String TAG_SEASON_SUMMARY = "Operations related with seasons";

    public static final String TAG_FANTASY = "Fantasy";
    public static final String TAG_FANTASY_SUMMARY = "Operations related with fantasy section";
    public static final String FANTASY_CLASIFICATION_SUMMARY = "Get complete fantasy clasification dataset of a season";

    public static final String TAG_SPRINT = "Sprint";
    public static final String TAG_SPRINT_SUMMARY = "Operations related with sprint section";

    public static final String TAG_CACHE = "Cache";
    public static final String TAG_CACHE_SUMMARY = "Operations related with cache section";

    // Endpoints
    public static final String ENDPOINT_ACCOUNT = "/account";
    public static final String ENDPOINT_ARCHIVES = "/archives";
    public static final String ENDPOINT_CIRCUIT = "/circuits";
    public static final String ENDPOINT_CONFIGURATION = "/configurations";
    public static final String ENDPOINT_DRIVER = "/drivers";
    public static final String ENDPOINT_STATISTICS = "/statistics";
    public static final String ENDPOINT_PENALTY = "/penalties";
    public static final String ENDPOINT_PENALTY_SEVERITY = "/penaltiesSeverity";
    public static final String ENDPOINT_RACE = "/races";
    public static final String ENDPOINT_RESULT = "/results";
    public static final String ENDPOINT_TEAMS = "/teams";
    public static final String ENDPOINT_SEASONS = "/seasons";
    public static final String ENDPOINT_FANTASY = "/fantasy";
    public static final String ENDPOINT_SPRINT = "/sprints";
    public static final String CACHE_STATS = "stats";
    public static final int MAX_SPECIFIC_DRIVER_IDS = 50;
    public static final String ENDPOINT_CACHE = "/cache";

    // Urls
    public static final String PRODUCTION_FRONTEND = "https://formulabollo.es/";
    public static final String LOCAL_FRONTEND = "http://localhost:4200/";

    // Season
    // shortcut: el frontend tiene su copia en src/enviroments; cambiar ambas al empezar temporada.
    public static final int ACTUAL_SEASON = Integer.parseInt(System.getenv().getOrDefault("SEASON_ACTUAL", "3"));

    public static final int FANTASY_BUDGET = 80_000_000;

    public static final HttpHeaders HEADERS_TEXT_PLAIN = createHeaders();

    private static HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN);
        return headers;
    }
}
