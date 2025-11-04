package com.azza.areajetpack.domain.repository

import kotlinx.coroutines.flow.Flow

interface AuthRepository {
    val logoutEvent: Flow<Unit>
    suspend fun login(email: String, password: String): Result<Unit>
    suspend fun register(username: String, email: String, password: String): Result<Unit>
    suspend fun getConnections(): Result<List<String>>
    fun logout()
    fun isLoggedIn(): Boolean
    fun saveToken(token: String)
}
