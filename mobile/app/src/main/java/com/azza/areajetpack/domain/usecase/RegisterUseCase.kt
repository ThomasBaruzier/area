package com.azza.areajetpack.domain.usecase

import com.azza.areajetpack.domain.repository.AuthRepository
import javax.inject.Inject

class RegisterUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(username: String, email: String, password: String): Result<Unit> {
        if (username.isBlank() || email.isBlank() || password.isBlank()) {
            return Result.failure(IllegalArgumentException("All fields are required."))
        }
        return authRepository.register(username, email, password)
    }
}
