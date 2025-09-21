package formula.bollo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
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
     * - Allows all POST requests to the /account/** endpoint without
     * authentication.
     * - Requires authentication for all other POST and PUT requests.
     * - Permits all other types of requests without authentication.
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
        http.csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "account/**", "cache/**",
                                "/results/totalPerSpecificDrivers/**", "/fantasy/**")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST, "/**").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/**").hasRole("ADMIN")
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