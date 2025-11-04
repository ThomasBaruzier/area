package com.azza.areajetpack.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.azza.areajetpack.domain.usecase.LoginUseCase
import com.azza.areajetpack.domain.usecase.RegisterUseCase
import com.azza.areajetpack.util.UiErrorHandler
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val loginUseCase: LoginUseCase,
    private val registerUseCase: RegisterUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Form())
    val uiState = _uiState.asStateFlow()

    private fun updateForm(update: (AuthFormData) -> AuthFormData) {
        _uiState.update {
            if (it is AuthUiState.Form) {
                it.copy(data = update(it.data))
            } else {
                it
            }
        }
    }

    fun onUsernameChange(username: String) = updateForm { it.copy(username = username) }
    fun onEmailChange(email: String) = updateForm { it.copy(email = email) }
    fun onPasswordChange(password: String) = updateForm { it.copy(password = password) }

    fun toggleMode() {
        _uiState.update {
            if (it is AuthUiState.Form) {
                it.copy(isLoginMode = !it.isLoginMode, error = null)
            } else {
                it
            }
        }
    }

    fun submit() {
        val currentState = _uiState.value
        if (currentState !is AuthUiState.Form) return

        if (currentState.isLoginMode) {
            login(currentState.data)
        } else {
            register(currentState.data)
        }
    }

    private fun login(data: AuthFormData) {
        viewModelScope.launch {
            _uiState.update { (it as AuthUiState.Form).copy(isLoading = true, error = null) }
            loginUseCase(data.email, data.password)
                .onSuccess { _uiState.value = AuthUiState.Success }
                .onFailure { e ->
                    _uiState.update {
                        (it as AuthUiState.Form).copy(isLoading = false, error = UiErrorHandler.handleError(e))
                    }
                }
        }
    }

    private fun register(data: AuthFormData) {
        viewModelScope.launch {
            _uiState.update { (it as AuthUiState.Form).copy(isLoading = true, error = null) }
            registerUseCase(data.username, data.email, data.password)
                .onSuccess { login(data) }
                .onFailure { e ->
                    _uiState.update {
                        (it as AuthUiState.Form).copy(isLoading = false, error = UiErrorHandler.handleError(e))
                    }
                }
        }
    }

    fun resetStateAfterSuccess() {
        _uiState.value = AuthUiState.Form()
    }
}
