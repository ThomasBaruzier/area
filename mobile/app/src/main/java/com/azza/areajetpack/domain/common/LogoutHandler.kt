package com.azza.areajetpack.domain.common

import com.azza.areajetpack.data.local.TokenManager
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LogoutHandler @Inject constructor(
    private val tokenManager: TokenManager
) {
    private val _logoutEvent = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val logoutEvent = _logoutEvent.asSharedFlow()

    fun logout() {
        tokenManager.clearToken()
        _logoutEvent.tryEmit(Unit)
    }
}
