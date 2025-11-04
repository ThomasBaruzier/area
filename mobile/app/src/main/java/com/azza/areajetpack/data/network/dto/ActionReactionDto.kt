package com.azza.areajetpack.data.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class ActionReactionDto(
    val id: Int,
    val name: String,
    val jsonFormat: Map<String, String>
)
