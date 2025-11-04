package com.azza.areajetpack.domain.repository

import kotlinx.coroutines.flow.Flow

interface SettingsRepository {
    fun getServerUrl(): Flow<String>
    suspend fun setServerUrl(url: String)
}
