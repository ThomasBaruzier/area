package com.azza.areajetpack.data.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class UserDto(
    val id: Int,
    val username: String,
    val email: String
)
