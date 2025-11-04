package com.azza.areajetpack.data.repository

import com.azza.areajetpack.data.network.ApiService
import com.azza.areajetpack.data.network.dto.CreateWorkflowRequest
import com.azza.areajetpack.data.network.dto.UpdateWorkflowRequest
import com.azza.areajetpack.data.network.dto.WorkflowActionDto
import com.azza.areajetpack.data.network.dto.WorkflowReactionDto
import com.azza.areajetpack.domain.model.Workflow
import com.azza.areajetpack.domain.model.WorkflowPayload
import com.azza.areajetpack.domain.repository.MetadataRepository
import com.azza.areajetpack.domain.repository.WorkflowRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject

class WorkflowRepositoryImpl @Inject constructor(
    private val apiService: ApiService,
    private val metadataRepository: MetadataRepository
) : WorkflowRepository {

    private data class ReactionInfo(val name: String, val serviceName: String)

    override suspend fun getWorkflows(): Result<List<Workflow>> = withContext(Dispatchers.IO) {
        try {
            val dtos = apiService.getWorkflows()
            val workflows = coroutineScope {
                dtos.map { dto ->
                    async {
                        val actionName = metadataRepository.getActionName(dto.action.serviceId, dto.action.actionId)
                        val actionServiceName = metadataRepository.getServiceName(dto.action.serviceId)

                        val reactionsInfo = dto.reactions.map { reactionDto ->
                            async {
                                ReactionInfo(
                                    name = metadataRepository.getReactionName(reactionDto.serviceId, reactionDto.reactionId),
                                    serviceName = metadataRepository.getServiceName(reactionDto.serviceId)
                                )
                            }
                        }.awaitAll()

                        Workflow(
                            id = dto.id,
                            isEnabled = dto.toggle,
                            actionName = actionName,
                            actionServiceName = actionServiceName,
                            reactionNames = reactionsInfo.map { it.name },
                            reactionServiceNames = reactionsInfo.map { it.serviceName }
                        )
                    }
                }.awaitAll()
            }
            Result.success(workflows)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun createWorkflow(payload: WorkflowPayload): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val request = CreateWorkflowRequest(
                toggle = true,
                action = WorkflowActionDto(
                    serviceId = payload.action.serviceId,
                    actionId = payload.action.actionId,
                    actionBody = buildJsonObject {
                        payload.action.fields.forEach { (key, value) ->
                            put(key, value)
                        }
                    }
                ),
                reactions = payload.reactions.map { reaction ->
                    WorkflowReactionDto(
                        serviceId = reaction.serviceId,
                        reactionId = reaction.reactionId,
                        reactionBody = buildJsonObject {
                            reaction.fields.forEach { (key, value) ->
                                put(key, value)
                            }
                        }
                    )
                }
            )
            apiService.createWorkflow(request)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteWorkflow(workflowId: Int): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            apiService.deleteWorkflow(workflowId)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun toggleWorkflow(workflowId: Int, isEnabled: Boolean): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            apiService.updateWorkflow(workflowId, UpdateWorkflowRequest(toggle = isEnabled))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
