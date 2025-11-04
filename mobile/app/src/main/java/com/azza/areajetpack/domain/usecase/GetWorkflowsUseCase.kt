package com.azza.areajetpack.domain.usecase

import com.azza.areajetpack.domain.model.Workflow
import com.azza.areajetpack.domain.repository.WorkflowRepository
import javax.inject.Inject

class GetWorkflowsUseCase @Inject constructor(
    private val workflowRepository: WorkflowRepository
) {
    suspend operator fun invoke(): Result<List<Workflow>> {
        return workflowRepository.getWorkflows()
    }
}
