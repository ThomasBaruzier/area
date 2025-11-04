package com.azza.areajetpack.domain.usecase

import com.azza.areajetpack.domain.model.ActionReactionItem
import com.azza.areajetpack.domain.repository.MetadataRepository
import javax.inject.Inject

class GetReactionsForServiceUseCase @Inject constructor(
    private val metadataRepository: MetadataRepository
) {
    suspend operator fun invoke(serviceId: Int, forceRefresh: Boolean = false): Result<List<ActionReactionItem>> {
        return try {
            Result.success(metadataRepository.getReactionsForService(serviceId, forceRefresh))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
