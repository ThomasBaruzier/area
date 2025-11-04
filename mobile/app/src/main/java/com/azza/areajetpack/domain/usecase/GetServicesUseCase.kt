package com.azza.areajetpack.domain.usecase

import com.azza.areajetpack.domain.model.Service
import com.azza.areajetpack.domain.repository.MetadataRepository
import javax.inject.Inject

class GetServicesUseCase @Inject constructor(
    private val metadataRepository: MetadataRepository
) {
    suspend operator fun invoke(forceRefresh: Boolean = false): Result<List<Service>> {
        return try {
            Result.success(metadataRepository.getServices(forceRefresh))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
