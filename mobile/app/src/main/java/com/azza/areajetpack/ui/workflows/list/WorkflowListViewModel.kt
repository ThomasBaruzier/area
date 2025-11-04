package com.azza.areajetpack.ui.workflows.list

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.azza.areajetpack.domain.model.Workflow
import com.azza.areajetpack.domain.usecase.DeleteWorkflowUseCase
import com.azza.areajetpack.domain.usecase.GetWorkflowsUseCase
import com.azza.areajetpack.domain.usecase.ToggleWorkflowUseCase
import com.azza.areajetpack.ui.common.UiState
import com.azza.areajetpack.util.FuzzySearch
import com.azza.areajetpack.util.UiErrorHandler
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WorkflowListViewModel @Inject constructor(
    private val getWorkflowsUseCase: GetWorkflowsUseCase,
    private val deleteWorkflowUseCase: DeleteWorkflowUseCase,
    private val toggleWorkflowUseCase: ToggleWorkflowUseCase
) : ViewModel() {

    private val _workflowsState = MutableStateFlow<UiState<List<Workflow>>>(UiState.Loading)

    private val _searchQuery = MutableStateFlow("")
    val searchQuery = _searchQuery.asStateFlow()

    val uiState: StateFlow<UiState<List<Workflow>>> = combine(
        _workflowsState,
        _searchQuery
    ) { state, query ->
        when (state) {
            is UiState.Success -> {
                val filtered = FuzzySearch.searchByWords(query, state.data) { it.actionName }
                UiState.Success(filtered)
            }
            else -> state
        }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = UiState.Loading
    )

    private val _workflowToDelete = MutableStateFlow<Workflow?>(null)
    val workflowToDelete = _workflowToDelete.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing = _isRefreshing.asStateFlow()

    init {
        viewModelScope.launch {
            loadWorkflows()
        }
    }

    private suspend fun loadWorkflows(forceRefresh: Boolean = false) {
        if (!forceRefresh) {
            _workflowsState.value = UiState.Loading
        }
        getWorkflowsUseCase()
            .onSuccess { _workflowsState.value = UiState.Success(it) }
            .onFailure { _workflowsState.value = UiState.Error(UiErrorHandler.handleError(it)) }
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            loadWorkflows(forceRefresh = true)
            _isRefreshing.value = false
        }
    }

    fun onDeleteRequest(workflow: Workflow) {
        _workflowToDelete.value = workflow
    }

    fun onDeleteConfirm(id: Int) {
        viewModelScope.launch {
            _workflowToDelete.value = null
            deleteWorkflowUseCase(id)
                .onSuccess { loadWorkflows(forceRefresh = true) }
                .onFailure { _workflowsState.value = UiState.Error(UiErrorHandler.handleError(it)) }
        }
    }

    fun onDeleteDismiss() {
        _workflowToDelete.value = null
    }

    fun onToggleWorkflow(id: Int, isEnabled: Boolean) {
        viewModelScope.launch {
            if (_workflowsState.value is UiState.Success) {
                val currentWorkflows = (_workflowsState.value as UiState.Success<List<Workflow>>).data
                val updatedWorkflows = currentWorkflows.map {
                    if (it.id == id) it.copy(isEnabled = isEnabled) else it
                }
                _workflowsState.value = UiState.Success(updatedWorkflows)
            }

            toggleWorkflowUseCase(id, isEnabled)
                .onFailure {
                    _workflowsState.value = UiState.Error(UiErrorHandler.handleError(it))
                    loadWorkflows(forceRefresh = true)
                }
        }
    }
}
