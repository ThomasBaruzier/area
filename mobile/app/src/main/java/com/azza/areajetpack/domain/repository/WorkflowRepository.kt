package com.azza.areajetpack.domain.repository

import com.azza.areajetpack.domain.model.Workflow
import com.azza.areajetpack.domain.model.WorkflowPayload

interface WorkflowRepository {
    suspend fun getWorkflows(): Result<List<Workflow>>
    suspend fun createWorkflow(payload: WorkflowPayload): Result<Unit>
    suspend fun deleteWorkflow(workflowId: Int): Result<Unit>
    suspend fun toggleWorkflow(workflowId: Int, isEnabled: Boolean): Result<Unit>
}
