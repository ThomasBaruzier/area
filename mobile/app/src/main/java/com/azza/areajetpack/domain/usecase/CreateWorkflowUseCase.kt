package com.azza.areajetpack.domain.usecase

import com.azza.areajetpack.domain.model.WorkflowPayload
import com.azza.areajetpack.domain.repository.WorkflowRepository
import javax.inject.Inject

class CreateWorkflowUseCase @Inject constructor(
    private val workflowRepository: WorkflowRepository
) {
    suspend operator fun invoke(payload: WorkflowPayload): Result<Unit> {
        return workflowRepository.createWorkflow(payload)
    }
}
