package com.side.forge.security.jwt;

import java.util.Date;
import java.util.function.Function;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.side.forge.user.entity.Users;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

	@Value("${jwt.secret}")
	private String secret;

	@Value("${jwt.issuer}")
	private String issuer;

	@Value("${spring.application.token.expiry}")
	private long tokenExpiry;

	public String generateToken(Users users) {
		return Jwts.builder().issuer(issuer).subject(users.getId().toString()).issuedAt(new Date())
				.expiration(new Date(System.currentTimeMillis() + tokenExpiry * 1000))
				.signWith(getKey(), Jwts.SIG.HS512).compact();
	}

	public Long extractUserId(String token) {
		return extractClaim(token, claims -> Long.valueOf(claims.getSubject()));
	}

	public boolean validateToken(String token) {
		Claims claims = extractAllClaims(token);
		return claims.getExpiration() != null && claims.getExpiration().after(new Date()) && claims.getSubject() != null
				&& !claims.getSubject().isBlank();
	}

	private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
		Claims claims = extractAllClaims(token);
		return claimsResolver.apply(claims);
	}

	private Claims extractAllClaims(String token) {
		return Jwts.parser().verifyWith(getKey()).requireIssuer(issuer).build().parseSignedClaims(token).getPayload();
	}

	private SecretKey getKey() {
		byte[] keyBytes = Decoders.BASE64.decode(secret);
		return Keys.hmacShaKeyFor(keyBytes);
	}
}
