package formula.bollo.config;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;

@Component
public class JwtRequestFilter extends OncePerRequestFilter {

    private final UserDetailsService userDetailsService;
    private final JwtConfig jwtConfig;

    public JwtRequestFilter(UserDetailsService userDetailsService, JwtConfig jwtConfig) {
        this.userDetailsService = userDetailsService;
        this.jwtConfig = jwtConfig;
    }

    /**
     * This method is responsible for processing incoming HTTP requests and applying
     * JWT authentication
     * for POST and PUT requests. It checks the Authorization header for a Bearer
     * token, extracts the
     * username from the token, and validates it. If the token is valid and the user
     * is not already
     * authenticated, it loads the user details and sets the authentication in the
     * security context.
     * 
     * @param request  the HttpServletRequest containing the request data
     * @param response the HttpServletResponse for sending a response back to the
     *                 client
     * @param chain    the FilterChain to continue the request processing
     * @throws ServletException if an error occurs during the request processing
     * @throws IOException      if an I/O error occurs during the request processing
     */
    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
            @NonNull FilterChain chain)
            throws ServletException, IOException {

        final String authorizationHeader = request.getHeader("Authorization");

        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            String jwt = authorizationHeader.substring(7);

            try {
                String username = jwtConfig.extractUsername(jwt);

                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

                if (jwtConfig.validateToken(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities());

                    authentication.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (Exception e) {
                logger.error("Cannot set user authentication", e);
            }
        }
        chain.doFilter(request, response);
    }
}
