package com.azza.areajetpack.domain.model

data class Workflow(
    val id: Int,
    val isEnabled: Boolean,
    val actionName: String,
    val actionServiceName: String,
    val reactionNames: List<String>,
    val reactionServiceNames: List<String>
)
