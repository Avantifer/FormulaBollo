package formula.bollo.controller;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import formula.bollo.model.StatisticsHeadToHeadDTO;
import formula.bollo.model.StatisticsOverviewDTO;
import formula.bollo.service.StatisticsService;
import formula.bollo.utils.Constants;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping(Constants.ENDPOINT_STATISTICS)
@Tag(name = Constants.TAG_STATISTICS, description = Constants.TAG_STATISTICS_SUMMARY)
public class StatisticsController {
    private final StatisticsService statisticsService;

    public StatisticsController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @Operation(summary = Constants.STATISTICS_HEAD_TO_HEAD_SUMMARY, tags = Constants.TAG_STATISTICS)
    @Transactional(readOnly = true)
    @GetMapping(path = "/headToHead", produces = MediaType.APPLICATION_JSON_VALUE)
    @Cacheable(cacheNames = Constants.CACHE_STATS, sync = true,
            key = "'statistics:h2h:' + #season + ':' + #a + ':' + #b")
    public StatisticsHeadToHeadDTO getHeadToHead(@RequestParam Integer season,
            @RequestParam String a, @RequestParam String b) {
        log.info("Se compara la informacion de {} y {} de la temporada {}", a, b, season);
        return statisticsService.getHeadToHead(season, a, b);
    }

    @Operation(summary = Constants.STATISTICS_OVERVIEW_SUMMARY, tags = Constants.TAG_STATISTICS)
    @Transactional(readOnly = true)
    @GetMapping(path = "/overview", produces = MediaType.APPLICATION_JSON_VALUE)
    @Cacheable(cacheNames = Constants.CACHE_STATS, sync = true, key = "'statistics:' + #season")
    public StatisticsOverviewDTO getOverview(@RequestParam Integer season) {
        log.info("Se coge la informacion de estadisticas de la temporada {}", season);
        return statisticsService.getOverview(season);
    }
}
