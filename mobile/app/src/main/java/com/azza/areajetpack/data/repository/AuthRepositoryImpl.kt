package com.azza.areajetpack.data.repository

import com.azza.areajetpack.data.local.TokenManager
import com.azza.areajetpack.data.network.ApiService
import com.azza.areajetpack.data.network.dto.AuthRequest
import com.azza.areajetpack.data.network.dto.CreateUserDto
import com.azza.areajetpack.domain.common.LogoutHandler
import com.azza.areajetpack.domain.repository.AuthRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val apiService: ApiService,
    private val tokenManager: TokenManager,
    private val logoutHandler: LogoutHandler
) : AuthRepository {

    override val logoutEvent: Flow<Unit> = logoutHandler.logoutEvent

    override suspend fun login(email: String, password: String):Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.login(AuthRequest(email, password))
            tokenManager.saveToken(response.accessToken)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun register(username: String, email: String, password: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            apiService.register(CreateUserDto(username, email, password))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getConnections(): Result<List<String>> = withContext(Dispatchers.IO) {
        try {
            val connections = apiService.getConnections()
            Result.success(connections)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override fun logout() {
        logoutHandler.logout()
    }

    override fun isLoggedIn(): Boolean {
        return tokenManager.getToken() != null
    }

    override fun saveToken(token: String) {
        tokenManager.saveToken(token)
    }
}
