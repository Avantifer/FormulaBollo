package formula.bollo.config;

import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.function.Function;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import formula.bollo.model.AccountDTO;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtConfig implements Serializable {
    private static final long serialVersionUID = -2550185165626007488L;
    public static final int JWT_TOKEN_VALIDITY = 60 * 24 * 30; // 30 days expiration

    @Value("${jwt.secret}")
    private String secret;

    /**
     * Generate a JWT token for the account.
     *
     * @param accountDTO AccountDTO
     * @return JWT token generated for the account
     */
    public String generateToken(AccountDTO accountDTO) {
        Date expiration = Date.from(LocalDateTime.now()
                .plusMinutes(JWT_TOKEN_VALIDITY)
                .atZone(ZoneId.systemDefault())
                .toInstant());

        return Jwts.builder()
                .subject(accountDTO.getUsername())
                .claim("userId", accountDTO.getId())
                .claim("admin", accountDTO.getAdmin())
                .issuedAt(new Date())
                .expiration(expiration)
                .signWith(this.getKey())
                .compact();
    }

    /**
     * Extracts the username from the provided JWT token.
     *
     * @param token the JWT token from which to extract the username
     * @return the username contained in the token
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Extracts the expiration date from the provided JWT token.
     *
     * @param token the JWT token from which to extract the expiration date
     * @return the expiration date of the token
     */
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Extracts a specific claim from the JWT token using the provided claims
     * resolver.
     *
     * @param <T>            the type of the claim to extract
     * @param token          the JWT token from which to extract the claim
     * @param claimsResolver a function that defines how to extract the claim
     * @return the extracted claim of type T
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Extracts all claims from the provided JWT token.
     *
     * @param token the JWT token from which to extract claims
     * @return the claims contained in the token
     */
    public Claims extractAllClaims(String token) {
        return Jwts
                .parser()
                .verifyWith(this.getKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Checks if the provided JWT token has expired.
     *
     * @param token the JWT token to check for expiration
     * @return true if the token is expired, false otherwise
     */
    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    /**
     * Validates the provided JWT token by comparing the extracted username with the
     * user details
     * and checking if the token is not expired.
     *
     * @param token       the JWT token to validate
     * @param userDetails the user details to compare against the token's username
     * @return true if the token is valid, false otherwise
     */
    public boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    /**
     * Generates a SecretKey from the secret string used for signing the JWT tokens.
     *
     * @return a SecretKey for JWT signing
     */
    public SecretKey getKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
