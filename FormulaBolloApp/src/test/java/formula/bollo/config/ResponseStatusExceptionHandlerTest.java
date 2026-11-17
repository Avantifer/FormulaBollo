package formula.bollo.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

@Execution(ExecutionMode.SAME_THREAD)
@SpringJUnitConfig(ResponseStatusExceptionHandlerTest.Config.class)
@WebAppConfiguration
class ResponseStatusExceptionHandlerTest {
    @Autowired WebApplicationContext context;

    @Test
    void badRequestExposesTheReasonAsPlainText() throws Exception {
        MockMvcBuilders.webAppContextSetup(context).build().perform(get("/reason"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
                .andExpect(content().string("Te pasas del presupuesto"));
    }

    @Test
    void forbiddenWithoutReasonHasAnEmptyPlainTextBody() throws Exception {
        MockMvcBuilders.webAppContextSetup(context).build().perform(get("/no-reason"))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
                .andExpect(content().string(""));
    }

    @Configuration
    @EnableWebMvc
    @ComponentScan(basePackages = "formula.bollo.config", useDefaultFilters = false,
            includeFilters = @ComponentScan.Filter(type = FilterType.ANNOTATION, classes = RestControllerAdvice.class))
    static class Config {
        @Bean FailureController failures() { return new FailureController(); }
    }

    @RestController
    static class FailureController {
        @GetMapping("/reason") String reason() {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Te pasas del presupuesto");
        }
        @GetMapping("/no-reason") String noReason() {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }
}
