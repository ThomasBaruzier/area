package com.azza.areajetpack.ui.navigation

import androidx.lifecycle.ViewModel
import com.azza.areajetpack.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

@HiltViewModel
class NavigationViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    sealed interface NavigationState {
        object Idle : NavigationState
        data class NavigateToMain(val pageIndex: Int) : NavigationState
    }

    fun isLoggedIn(): Boolean = authRepository.isLoggedIn()
    fun logout() = authRepository.logout()
    val logoutEvents: Flow<Unit> = authRepository.logoutEvent

    private val _navigationState = MutableStateFlow<NavigationState>(NavigationState.Idle)
    val navigationState = _navigationState.asStateFlow()

    fun handleOauthCallback(token: String) {
        authRepository.saveToken(token)
        _navigationState.value = NavigationState.NavigateToMain(1)
    }

    fun handleLoginSuccess() {
        _navigationState.value = NavigationState.NavigateToMain(0)
    }

    fun onNavigationComplete() {
        _navigationState.value = NavigationState.Idle
    }
}
