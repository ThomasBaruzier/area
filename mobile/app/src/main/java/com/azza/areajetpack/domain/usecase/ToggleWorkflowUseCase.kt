package com.azza.areajetpack.domain.usecase

import com.azza.areajetpack.domain.repository.WorkflowRepository
import javax.inject.Inject

class ToggleWorkflowUseCase @Inject constructor(
    private val workflowRepository: WorkflowRepository
) {
    suspend operator fun invoke(workflowId: Int, isEnabled: Boolean): Result<Unit> {
        return workflowRepository.toggleWorkflow(workflowId, isEnabled)
    }
}
