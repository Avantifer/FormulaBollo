package formula.bollo.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;

@Configuration
@SecurityScheme(name = "Bearer Authentication", type = SecuritySchemeType.HTTP, bearerFormat = "JWT", scheme = "bearer")
public class SwaggerConfig {

    /**
     * Creates and configures an OpenAPI instance for the FormulaBollo API
     * documentation.
     * This method sets up the basic information and components for the API,
     * allowing
     * for easy generation and viewing of API documentation.
     * 
     * - Sets the title of the API to "FormulaBollo API".
     * - Provides a description explaining that this is the backend used for
     * managing FormulaBollo.
     * - Specifies the version of the API as "v1.0.0".
     * - Adds contact information for the API's maintainer, Fernando Ruiz, including
     * an email address.
     * - Defines the license for the API as Apache 2.0 and provides a URL for more
     * information.
     * - Initializes the API components section (currently empty but can be
     * populated with schemas, responses, etc.).
     * - Lists the available servers where the API can be accessed, including:
     * - A development server running on localhost.
     * - A production server at the specified URL.
     * 
     * @return an OpenAPI instance configured with the relevant API information and
     *         server details
     */
    @Bean
    public OpenAPI opeanApiFormulaBollo() {
        return new OpenAPI()
                .info(new Info()
                        .title("FormulaBollo API")
                        .description("Backend utilizado para la gestión de FormulaBollo")
                        .version("v1.0.0")
                        .contact(new Contact()
                                .name("Fernando Ruiz")
                                .email("ferenandoruiz@gmail.com"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("http://springdoc.org")))
                .components(new Components())
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Development Server"),
                        new Server().url("https://formulabollo.es:8443").description("Production Server")));
    }
}
