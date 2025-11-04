package com.azza.areajetpack.data.local

import android.content.SharedPreferences
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenManager @Inject constructor(
    private val prefs: SharedPreferences
) {
    companion object {
        private const val AUTH_TOKEN_KEY = "auth_token"
    }

    fun saveToken(token: String) {
        prefs.edit().putString(AUTH_TOKEN_KEY, token).apply()
    }

    fun getToken(): String? {
        return prefs.getString(AUTH_TOKEN_KEY, null)
    }

    fun clearToken() {
        prefs.edit().remove(AUTH_TOKEN_KEY).apply()
    }
}
