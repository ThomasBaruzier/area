package com.azza.areajetpack.domain.usecase

import com.azza.areajetpack.domain.repository.AuthRepository
import javax.inject.Inject

class GetConnectionsUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(): Result<List<String>> {
        return authRepository.getConnections()
    }
}
