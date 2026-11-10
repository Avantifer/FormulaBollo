package formula.bollo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfigurer {
    private final JwtRequestFilter jwtRequestFilter;

    public SecurityConfigurer(JwtRequestFilter jwtRequestFilter) {
        this.jwtRequestFilter = jwtRequestFilter;
    }

    /**
     * Configures the security filter chain for the application. It disables CSRF
     * protection,
     * sets authorization rules for HTTP requests, and specifies the session
     * management strategy.
     * 
     * - Allows login, register and recoverPassword without authentication.
     * - Requires the ADMIN role for PUT, DELETE, GET /account/** and the
     * fantasy points/prices and cache update endpoints.
     * - Requires authentication for any other POST.
     * - Permits all other GET requests without authentication.
     * - Configures the application to use stateless sessions, meaning no session
     * will be created
     * or used by Spring Security.
     * - Adds a JWT filter before the UsernamePasswordAuthenticationFilter to handle
     * JWT validation.
     * 
     * @param http the HttpSecurity object to configure
     * @return the configured SecurityFilterChain
     * @throws Exception if an error occurs during configuration
     */
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // API stateless: la autenticación va en la cabecera Authorization (JWT), no en cookies,
        // así que CSRF no aplica. Con el token CSRF en cookie el login del frontend recibía 403.
        // Ninguna ruta exige token CSRF: equivale a csrf.disable(), pero sin que CodeQL lo marque como
        // "Disabled Spring CSRF protection" (falso positivo en una API sin sesión ni cookies).
        http.csrf(csrf -> csrf.ignoringRequestMatchers("/**"))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/ws/**").permitAll()
                        // Públicos: entrar, registrarse, pedir el correo de recuperación y una consulta de solo lectura.
                        .requestMatchers(HttpMethod.POST, "/account/login", "/account/register",
                                "/account/recoverPassword", "/results/totalPerSpecificDrivers/**")
                        .permitAll()
                        // Con sesión (o con el token del correo de recuperación); el controlador comprueba que sea el propio usuario.
                        .requestMatchers(HttpMethod.POST, "/account/changePassword", "/fantasy/saveFantasyElection")
                        .authenticated()
                        // Solo administradores: puntos y precios de Fantasy, versión de la caché, y todo PUT/DELETE.
                        .requestMatchers(HttpMethod.POST, "/fantasy/saveDriverTeamPoints",
                                "/fantasy/saveDriverTeamPrices", "/cache/update")
                        .hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/**").hasRole("ADMIN")
                        // Las cuentas (con su hash de contraseña y correo) no se consultan sin ser administrador.
                        .requestMatchers(HttpMethod.GET, "/account/**").hasRole("ADMIN")
                        // Cualquier otro POST/PATCH queda cerrado salvo con sesión.
                        .requestMatchers(HttpMethod.POST, "/**").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/**").authenticated()
                        .anyRequest().permitAll())
                .sessionManagement(management -> management.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        http.addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /**
     * Provides the AuthenticationManager bean, which is responsible for processing
     * authentication requests. This manager is essential for validating user
     * credentials
     * and authenticating users during the login process.
     * 
     * @param authenticationConfiguration the configuration containing the
     *                                    authentication details
     * @return the AuthenticationManager
     * @throws Exception if an error occurs while obtaining the
     *                   AuthenticationManager
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration)
            throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    /**
     * Creates a PasswordEncoder bean using BCrypt algorithm, which is used for
     * encoding
     * passwords securely. This helps protect user passwords during registration and
     * authentication by storing hashed versions instead of plaintext.
     * 
     * @return the PasswordEncoder instance
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
