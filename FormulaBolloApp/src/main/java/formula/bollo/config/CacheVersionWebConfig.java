package formula.bollo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import formula.bollo.utils.Constants;

/** Registra {@link CacheVersionInterceptor} solo en los endpoints que guardan datos que los clientes cachean. */
@Configuration
public class CacheVersionWebConfig implements WebMvcConfigurer {

    private final CacheVersionInterceptor cacheVersionInterceptor;

    public CacheVersionWebConfig(CacheVersionInterceptor cacheVersionInterceptor) {
        this.cacheVersionInterceptor = cacheVersionInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(cacheVersionInterceptor).addPathPatterns(
                Constants.ENDPOINT_RESULT + "/save", Constants.ENDPOINT_RESULT + "/delete",
                Constants.ENDPOINT_SPRINT + "/save", Constants.ENDPOINT_SPRINT + "/delete",
                Constants.ENDPOINT_RACE + "/save",
                Constants.ENDPOINT_PENALTY + "/save",
                Constants.ENDPOINT_FANTASY + "/saveDriverTeamPoints",
                Constants.ENDPOINT_FANTASY + "/saveDriverTeamPrices");
    }
}
