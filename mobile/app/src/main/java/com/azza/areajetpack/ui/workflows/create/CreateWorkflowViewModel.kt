package com.azza.areajetpack.ui.workflows.create

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.azza.areajetpack.domain.model.ActionReactionItem
import com.azza.areajetpack.domain.model.ConfiguredAction
import com.azza.areajetpack.domain.model.ConfiguredReaction
import com.azza.areajetpack.domain.model.Service
import com.azza.areajetpack.domain.model.WorkflowPayload
import com.azza.areajetpack.domain.usecase.CreateWorkflowUseCase
import com.azza.areajetpack.domain.usecase.GetActionsForServiceUseCase
import com.azza.areajetpack.domain.usecase.GetConnectionsUseCase
import com.azza.areajetpack.domain.usecase.GetReactionsForServiceUseCase
import com.azza.areajetpack.domain.usecase.GetServicesUseCase
import com.azza.areajetpack.util.FuzzySearch
import com.azza.areajetpack.util.UiErrorHandler
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CreateWorkflowViewModel @Inject constructor(
    private val getServicesUseCase: GetServicesUseCase,
    private val getActionsForServiceUseCase: GetActionsForServiceUseCase,
    private val getReactionsForServiceUseCase: GetReactionsForServiceUseCase,
    private val createWorkflowUseCase: CreateWorkflowUseCase,
    private val getConnectionsUseCase: GetConnectionsUseCase,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CreateWorkflowState())
    val uiState = _uiState.asStateFlow()

    val filteredServices: StateFlow<List<Service>> = _uiState.map { state ->
        val connectedServices = state.services.filter { service ->
            state.connectedServiceNames.contains(service.name.lowercase())
        }
        FuzzySearch.searchByWords(state.searchQuery, connectedServices) { it.name }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val hasConnectedServices: StateFlow<Boolean> = _uiState.map { state ->
        state.services.any { service -> state.connectedServiceNames.contains(service.name.lowercase()) }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    val filteredActions: StateFlow<List<ActionReactionItem>> = _uiState.map { state ->
        FuzzySearch.searchByWords(state.searchQuery, state.actions) { it.name }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val filteredReactions: StateFlow<List<ActionReactionItem>> = _uiState.map { state ->
        FuzzySearch.searchByWords(state.searchQuery, state.reactions) { it.name }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun loadInitialData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            val servicesResult = getServicesUseCase()
            val connectionsResult = getConnectionsUseCase()

            if (servicesResult.isSuccess && connectionsResult.isSuccess) {
                val services = servicesResult.getOrThrow()
                val connectedNames = connectionsResult.getOrThrow().map { it.lowercase() }.toSet()
                _uiState.update {
                    it.copy(
                        services = services,
                        connectedServiceNames = connectedNames,
                        isLoading = false
                    )
                }
            } else {
                val error = servicesResult.exceptionOrNull() ?: connectionsResult.exceptionOrNull()!!
                _uiState.update { it.copy(error = UiErrorHandler.handleError(error), isLoading = false) }
            }
        }
    }

    fun onSearchQueryChange(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    private fun resetSearch() {
        _uiState.update { it.copy(searchQuery = "") }
    }

    fun onActionServiceSelected(serviceId: Int) {
        resetSearch()
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, selectedActionServiceId = serviceId) }
            getActionsForServiceUseCase(serviceId)
                .onSuccess { actions ->
                    _uiState.update {
                        it.copy(actions = actions, isLoading = false, currentStep = WizardStep.SELECT_ACTION)
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = UiErrorHandler.handleError(e), isLoading = false) }
                }
        }
    }

    fun onActionSelected(actionId: Int) {
        resetSearch()
        val action = _uiState.value.actions.find { it.id == actionId }
        _uiState.update {
            it.copy(
                selectedAction = action,
                currentStep = WizardStep.CONFIGURE_ACTION
            )
        }
    }

    fun onActionFieldChanged(key: String, value: String) {
        _uiState.update {
            val newFields = it.actionFields.toMutableMap()
            newFields[key] = value
            it.copy(actionFields = newFields)
        }
    }

    fun onActionConfigured() {
        _uiState.update { it.copy(currentStep = WizardStep.SELECT_REACTION_SERVICE) }
    }

    fun onReactionServiceSelected(serviceId: Int) {
        resetSearch()
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, selectedReactionServiceId = serviceId) }
            getReactionsForServiceUseCase(serviceId)
                .onSuccess { reactions ->
                    _uiState.update {
                        it.copy(reactions = reactions, isLoading = false, currentStep = WizardStep.SELECT_REACTION)
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = UiErrorHandler.handleError(e), isLoading = false) }
                }
        }
    }

    fun onReactionSelected(reactionId: Int) {
        resetSearch()
        val reaction = _uiState.value.reactions.find { it.id == reactionId }
        _uiState.update {
            it.copy(
                selectedReaction = reaction,
                currentStep = WizardStep.CONFIGURE_REACTION
            )
        }
    }

    fun onReactionFieldChanged(key: String, value: String) {
        _uiState.update {
            val newFields = it.reactionFields.toMutableMap()
            newFields[key] = value
            it.copy(reactionFields = newFields)
        }
    }

    fun onReactionConfigured() {
        _uiState.update { it.copy(currentStep = WizardStep.REVIEW) }
    }

    fun createWorkflow() {
        val state = _uiState.value
        if (state.selectedAction == null || state.selectedReaction == null || state.selectedActionServiceId == null || state.selectedReactionServiceId == null) {
            _uiState.update { it.copy(error = "Incomplete workflow configuration.") }
            return
        }

        val payload = WorkflowPayload(
            action = ConfiguredAction(state.selectedActionServiceId, state.selectedAction.id, state.actionFields),
            reactions = listOf(ConfiguredReaction(state.selectedReactionServiceId, state.selectedReaction.id, state.reactionFields))
        )

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            createWorkflowUseCase(payload)
                .onSuccess {
                    _uiState.update { it.copy(isLoading = false, isSuccess = true) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = UiErrorHandler.handleError(e), isLoading = false) }
                }
        }
    }

    fun onBack() {
        resetSearch()
        _uiState.update {
            val previousStep = WizardStep.entries.getOrNull(it.currentStep.ordinal - 1) ?: WizardStep.SELECT_ACTION_SERVICE
            it.copy(currentStep = previousStep, error = null)
        }
    }
}
