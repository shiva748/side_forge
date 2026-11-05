package com.side.forge.common;

import java.util.Base64;

import io.jsonwebtoken.Jwts;

public class JwtKeyGenerator {

	static void main(String[] args) {
		String secret = Base64.getEncoder().encodeToString(Jwts.SIG.HS512.key().build().getEncoded());

		System.out.println(secret);
	}
}
