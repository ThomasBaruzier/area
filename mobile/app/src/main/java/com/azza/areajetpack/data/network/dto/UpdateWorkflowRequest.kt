package com.azza.areajetpack.data.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class UpdateWorkflowRequest(
    val toggle: Boolean
)
