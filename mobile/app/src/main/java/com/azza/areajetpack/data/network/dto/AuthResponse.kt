package com.azza.areajetpack.data.network.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AuthResponse(
    val user: UserDto,
    @SerialName("access_token") val accessToken: String
)
