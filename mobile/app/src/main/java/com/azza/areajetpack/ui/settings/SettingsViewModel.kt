package com.azza.areajetpack.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.azza.areajetpack.domain.repository.SettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository
) : ViewModel() {

    sealed interface SettingsEvent {
        object NavigateBack : SettingsEvent
    }

    val serverUrl = settingsRepository.getServerUrl()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "")

    private val _events = MutableSharedFlow<SettingsEvent>()
    val events = _events.asSharedFlow()

    fun saveServerUrl(url: String) {
        viewModelScope.launch {
            settingsRepository.setServerUrl(url)
            _events.emit(SettingsEvent.NavigateBack)
        }
    }
}
