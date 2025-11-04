package com.azza.areajetpack.domain.model

data class WorkflowPayload(
    val action: ConfiguredAction,
    val reactions: List<ConfiguredReaction>
)

data class ConfiguredAction(
    val serviceId: Int,
    val actionId: Int,
    val fields: Map<String, String>
)

data class ConfiguredReaction(
    val serviceId: Int,
    val reactionId: Int,
    val fields: Map<String, String>
)
