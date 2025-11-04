package com.azza.areajetpack.data.network

import com.azza.areajetpack.domain.common.LogoutHandler
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import javax.inject.Inject

class TokenAuthenticator @Inject constructor(
    private val logoutHandler: LogoutHandler
) : Authenticator {
    override fun authenticate(route: Route?, response: Response): Request? {
        runBlocking {
            logoutHandler.logout()
        }
        return null
    }
}
