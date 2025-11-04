package com.azza.areajetpack.ui.services

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.azza.areajetpack.data.local.TokenManager
import com.azza.areajetpack.domain.model.Service
import com.azza.areajetpack.domain.repository.SettingsRepository
import com.azza.areajetpack.domain.usecase.GetConnectionsUseCase
import com.azza.areajetpack.domain.usecase.GetServicesUseCase
import com.azza.areajetpack.ui.common.UiState
import com.azza.areajetpack.util.FuzzySearch
import com.azza.areajetpack.util.UiErrorHandler
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.Base64
import javax.inject.Inject

data class ServiceItem(
    val service: Service,
    val isConnected: Boolean
)

@HiltViewModel
class ServiceListViewModel @Inject constructor(
    private val getServicesUseCase: GetServicesUseCase,
    private val getConnectionsUseCase: GetConnectionsUseCase,
    private val settingsRepository: SettingsRepository,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _servicesState = MutableStateFlow<UiState<List<ServiceItem>>>(UiState.Loading)

    private val _searchQuery = MutableStateFlow("")
    val searchQuery = _searchQuery.asStateFlow()

    val uiState: StateFlow<UiState<List<ServiceItem>>> = combine(
        _servicesState,
        _searchQuery
    ) { state, query ->
        when (state) {
            is UiState.Success -> {
                val filtered = FuzzySearch.searchByWords(query, state.data) { it.service.name }
                UiState.Success(filtered)
            }
            else -> state
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = UiState.Loading
    )

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing = _isRefreshing.asStateFlow()

    private val _openUrlEvent = Channel<String>()
    val openUrlEvent = _openUrlEvent.receiveAsFlow()

    init {
        viewModelScope.launch {
            loadData()
        }
    }

    private suspend fun loadData(forceRefresh: Boolean = false) {
        if (!forceRefresh) _servicesState.value = UiState.Loading
        val servicesResult = getServicesUseCase(forceRefresh)
        val connectionsResult = getConnectionsUseCase()

        if (servicesResult.isSuccess && connectionsResult.isSuccess) {
            val services = servicesResult.getOrThrow()
            val connections = connectionsResult.getOrThrow().map { it.lowercase() }.toSet()
            val serviceItems = services.map { service ->
                ServiceItem(
                    service = service,
                    isConnected = connections.contains(service.name.lowercase())
                )
            }
            _servicesState.value = UiState.Success(serviceItems)
        } else {
            val error = servicesResult.exceptionOrNull() ?: connectionsResult.exceptionOrNull()
            _servicesState.value = UiState.Error(UiErrorHandler.handleError(error ?: Exception("Unknown error")))
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            loadData(forceRefresh = true)
            _isRefreshing.value = false
        }
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun onConnectClicked(service: Service) {
        viewModelScope.launch {
            try {
                val serverUrl = settingsRepository.getServerUrl().first()
                val token = tokenManager.getToken()
                val stateJson = buildJsonObject {
                    put("origin", "mobile")
                    if (token != null) {
                        put("token", token)
                    }
                }.toString()
                val encodedState = Base64.getEncoder().encodeToString(stateJson.toByteArray())
                val authUrl = "${serverUrl.trimEnd('/')}/auth/${service.name.lowercase()}?state=$encodedState"
                _openUrlEvent.send(authUrl)
            } catch (e: Exception) {
                _servicesState.value = UiState.Error("Could not construct authentication URL.")
            }
        }
    }
}
