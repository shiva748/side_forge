package com.side.forge.user.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.side.forge.user.entity.Users;

public interface UserRepository extends JpaRepository<Users, Long> {

	Optional<Users> findByEmail(String email);

	Optional<Users> findByPhoneNumber(String phoneNumber);

	Optional<Users> findByEmailOrPhoneNumber(String email, String phoneNumber);

}