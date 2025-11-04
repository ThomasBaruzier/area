package com.azza.areajetpack.data.network.dto

import kotlinx.serialization.Serializable

@Serializable
data class CreateUserDto(
    val username: String,
    val email: String,
    val password: String
)
