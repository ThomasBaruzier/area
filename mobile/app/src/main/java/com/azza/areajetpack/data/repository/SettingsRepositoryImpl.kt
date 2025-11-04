package com.azza.areajetpack.data.repository

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.azza.areajetpack.BuildConfig
import com.azza.areajetpack.domain.repository.SettingsRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class SettingsRepositoryImpl @Inject constructor(
    private val dataStore: DataStore<Preferences>
) : SettingsRepository {

    private object PreferencesKeys {
        val SERVER_URL = stringPreferencesKey("server_url")
    }

    companion object {
        val DEFAULT_URL = BuildConfig.DEFAULT_SERVER_URL
    }

    override fun getServerUrl(): Flow<String> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.SERVER_URL] ?: DEFAULT_URL
    }

    override suspend fun setServerUrl(url: String) {
        dataStore.edit { preferences ->
            preferences[PreferencesKeys.SERVER_URL] = url
        }
    }
}
