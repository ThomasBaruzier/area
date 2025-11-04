package com.azza.areajetpack.util

import com.azza.areajetpack.di.ApplicationScope
import com.azza.areajetpack.domain.repository.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AppInitializer @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val baseUrlHolder: BaseUrlHolder,
    @ApplicationScope private val externalScope: CoroutineScope
) {
    fun initialize() {
        externalScope.launch {
            settingsRepository.getServerUrl().collect { url ->
                baseUrlHolder.currentUrl = url
            }
        }
    }
}
