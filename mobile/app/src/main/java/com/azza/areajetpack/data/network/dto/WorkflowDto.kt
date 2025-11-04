package com.azza.areajetpack.data.network.dto

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class WorkflowDto(
    val id: Int,
    val toggle: Boolean,
    val action: WorkflowActionDto,
    val reactions: List<WorkflowReactionDto>
)

@Serializable
data class WorkflowActionDto(
    val serviceId: Int,
    val actionId: Int,
    val actionBody: JsonElement
)

@Serializable
data class WorkflowReactionDto(
    val serviceId: Int,
    val reactionId: Int,
    val reactionBody: JsonElement
)

@Serializable
data class CreateWorkflowRequest(
    val toggle: Boolean,
    val action: WorkflowActionDto,
    val reactions: List<WorkflowReactionDto>
)
