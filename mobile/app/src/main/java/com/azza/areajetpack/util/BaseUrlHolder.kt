package com.azza.areajetpack.util

import com.azza.areajetpack.data.repository.SettingsRepositoryImpl
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BaseUrlHolder @Inject constructor() {
    @Volatile
    var currentUrl: String = SettingsRepositoryImpl.DEFAULT_URL
}
