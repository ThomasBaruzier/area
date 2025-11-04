package com.azza.areajetpack.ui.auth

import app.cash.turbine.test
import com.azza.areajetpack.MainDispatcherRule
import com.azza.areajetpack.domain.usecase.LoginUseCase
import com.azza.areajetpack.domain.usecase.RegisterUseCase
import com.azza.areajetpack.util.UiErrorHandler
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@ExperimentalCoroutinesApi
class AuthViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var loginUseCase: LoginUseCase
    private lateinit var registerUseCase: RegisterUseCase
    private lateinit var viewModel: AuthViewModel

    @Before
    fun setUp() {
        loginUseCase = mockk()
        registerUseCase = mockk()
        viewModel = AuthViewModel(loginUseCase, registerUseCase)
    }

    @Test
    fun `initial state is Form with login mode`() = runTest {
        val initialState = viewModel.uiState.value
        assertTrue(initialState is AuthUiState.Form)
        val formState = initialState as AuthUiState.Form
        assertTrue(formState.isLoginMode)
        assertFalse(formState.isLoading)
        assertEquals(null, formState.error)
    }

    @Test
    fun `submit calls loginUseCase when in login mode and succeeds`() = runTest {
        val email = "test@example.com"
        val password = "password"
        coEvery { loginUseCase(email, password) } returns Result.success(Unit)

        viewModel.onEmailChange(email)
        viewModel.onPasswordChange(password)

        viewModel.uiState.test {
            val initialState = awaitItem()
            assertTrue(initialState is AuthUiState.Form)

            viewModel.submit()

            val finalState = awaitItem()
            assertTrue(finalState is AuthUiState.Success ||
                      (finalState is AuthUiState.Form && finalState.isLoading))

            if (finalState is AuthUiState.Form && finalState.isLoading) {
                assertEquals(AuthUiState.Success, awaitItem())
            } else if (finalState is AuthUiState.Success) {
                assertEquals(AuthUiState.Success, finalState)
            }

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `submit calls loginUseCase and handles failure`() = runTest {
        val email = "test@example.com"
        val password = "wrong"
        val exception = Exception("Invalid credentials")
        coEvery { loginUseCase(email, password) } returns Result.failure(exception)

        viewModel.onEmailChange(email)
        viewModel.onPasswordChange(password)

        viewModel.uiState.test {
            val initialState = awaitItem()
            assertTrue(initialState is AuthUiState.Form)

            viewModel.submit()

            val finalState = awaitItem()
            assertTrue(finalState is AuthUiState.Form)
            val formState = finalState as AuthUiState.Form

            if (formState.isLoading) {
                val errorState = awaitItem()
                assertTrue(errorState is AuthUiState.Form)
                val errorFormState = errorState as AuthUiState.Form
                assertFalse(errorFormState.isLoading)
                assertEquals(UiErrorHandler.handleError(exception), errorFormState.error)
            } else {
                assertFalse(formState.isLoading)
                assertEquals(UiErrorHandler.handleError(exception), formState.error)
            }

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `submit calls registerUseCase then loginUseCase on success`() = runTest {
        val username = "user"
        val email = "new@example.com"
        val password = "password"
        coEvery { registerUseCase(username, email, password) } returns Result.success(Unit)
        coEvery { loginUseCase(email, password) } returns Result.success(Unit)

        viewModel.uiState.test {
            assertEquals(AuthUiState.Form(isLoginMode = true), awaitItem())

            viewModel.toggleMode()
            assertEquals(AuthUiState.Form(isLoginMode = false, error = null), awaitItem())

            viewModel.onUsernameChange(username)
            awaitItem()

            viewModel.onEmailChange(email)
            awaitItem()

            viewModel.onPasswordChange(password)
            awaitItem()

            viewModel.submit()

            awaitItem()
            assertEquals(AuthUiState.Success, awaitItem())
        }
    }

    @Test
    fun `toggleMode switches between login and register`() = runTest {
        viewModel.uiState.test {
            assertTrue((awaitItem() as AuthUiState.Form).isLoginMode)
            viewModel.toggleMode()
            assertFalse((awaitItem() as AuthUiState.Form).isLoginMode)
            viewModel.toggleMode()
            assertTrue((awaitItem() as AuthUiState.Form).isLoginMode)
        }
    }
}
