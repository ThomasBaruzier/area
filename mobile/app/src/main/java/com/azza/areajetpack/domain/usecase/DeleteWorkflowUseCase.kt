package com.azza.areajetpack.domain.usecase

import com.azza.areajetpack.domain.repository.WorkflowRepository
import javax.inject.Inject

class DeleteWorkflowUseCase @Inject constructor(
    private val workflowRepository: WorkflowRepository
) {
    suspend operator fun invoke(workflowId: Int): Result<Unit> {
        return workflowRepository.deleteWorkflow(workflowId)
    }
}
