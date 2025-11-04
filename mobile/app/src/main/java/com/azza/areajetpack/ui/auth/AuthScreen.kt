package com.azza.areajetpack.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.azza.areajetpack.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthScreen(
    onLoginSuccess: () -> Unit,
    onNavigateToSettings: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current

    LaunchedEffect(uiState) {
        if (uiState is AuthUiState.Success) {
            onLoginSuccess()
            viewModel.resetStateAfterSuccess()
        }
    }

    val formState = uiState as? AuthUiState.Form

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            TextButton(
                onClick = onNavigateToSettings,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Text(stringResource(R.string.server_settings_button))
            }
        }
    ) { padding ->
        if (formState != null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 24.dp)
                    .imePadding(),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = if (formState.isLoginMode) stringResource(R.string.login_title) else stringResource(R.string.register_title),
                    style = MaterialTheme.typography.headlineLarge,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(48.dp))

                if (!formState.isLoginMode) {
                    OutlinedTextField(
                        value = formState.data.username,
                        onValueChange = viewModel::onUsernameChange,
                        label = { Text(stringResource(R.string.username_label)) },
                        modifier = Modifier.fillMaxWidth(),
                        isError = formState.error != null,
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                        keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                }

                OutlinedTextField(
                    value = formState.data.email,
                    onValueChange = viewModel::onEmailChange,
                    label = { Text(stringResource(R.string.email_label)) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                    keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) }),
                    modifier = Modifier.fillMaxWidth(),
                    isError = formState.error != null,
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = formState.data.password,
                    onValueChange = viewModel::onPasswordChange,
                    label = { Text(stringResource(R.string.password_label)) },
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { viewModel.submit() }),
                    modifier = Modifier.fillMaxWidth(),
                    isError = formState.error != null,
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(24.dp))

                if (formState.error != null) {
                    Text(
                        text = formState.error,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(bottom = 8.dp),
                        textAlign = TextAlign.Center
                    )
                }

                if (formState.isLoading) {
                    CircularProgressIndicator()
                } else {
                    Button(
                        onClick = { viewModel.submit() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        Text(
                            text = if (formState.isLoginMode) stringResource(R.string.login_button) else stringResource(R.string.register_button),
                            style = MaterialTheme.typography.labelLarge
                        )
                    }
                }

                TextButton(onClick = { viewModel.toggleMode() }) {
                    Text(if (formState.isLoginMode) stringResource(R.string.auth_switch_to_register) else stringResource(R.string.auth_switch_to_login))
                }
            }
        }
    }
}
