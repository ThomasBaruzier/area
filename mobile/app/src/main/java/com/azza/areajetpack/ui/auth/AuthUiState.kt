package com.azza.areajetpack.ui.auth

data class AuthFormData(
    val username: String = "",
    val email: String = "",
    val password: String = ""
)

sealed interface AuthUiState {
    data class Form(
        val data: AuthFormData = AuthFormData(),
        val isLoginMode: Boolean = true,
        val isLoading: Boolean = false,
        val error: String? = null
    ) : AuthUiState
    object Success : AuthUiState
}
