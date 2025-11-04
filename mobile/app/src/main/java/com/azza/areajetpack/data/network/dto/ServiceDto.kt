package com.azza.areajetpack.data.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class ServiceDto(
    val id: Int,
    val name: String,
    val description: String
)
