package com.azza.areajetpack.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.azza.areajetpack.ui.auth.AuthScreen
import com.azza.areajetpack.ui.main.MainScreen
import com.azza.areajetpack.ui.settings.SettingsScreen
import com.azza.areajetpack.ui.workflows.create.CreateWorkflowScreen
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach

@Composable
fun AppNavigation(
    viewModel: NavigationViewModel = hiltViewModel()
) {
    val navController = rememberNavController()
    val startDestination = if (viewModel.isLoggedIn()) Screen.Main.createRoute(0) else Screen.Auth.route
    val navigationState by viewModel.navigationState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.logoutEvents.onEach {
            navController.navigate(Screen.Auth.route) {
                popUpTo(navController.graph.id) { inclusive = true }
            }
        }.launchIn(this)
    }

    LaunchedEffect(navigationState) {
        (navigationState as? NavigationViewModel.NavigationState.NavigateToMain)?.let { navState ->
            navController.navigate(Screen.Main.createRoute(navState.pageIndex)) {
                popUpTo(navController.graph.id) { inclusive = true }
            }
            viewModel.onNavigationComplete()
        }
    }

    NavHost(navController = navController, startDestination = startDestination) {
        composable(Screen.Auth.route) {
            AuthScreen(
                onLoginSuccess = { viewModel.handleLoginSuccess() },
                onNavigateToSettings = { navController.navigate(Screen.Settings.route) }
            )
        }
        composable(Screen.Settings.route) {
            SettingsScreen(onBack = { navController.popBackStack() })
        }
        composable(
            route = Screen.Main.route,
            arguments = listOf(navArgument("startPage") {
                type = NavType.IntType
                defaultValue = 0
            })
        ) { backStackEntry ->
            val startPage = backStackEntry.arguments?.getInt("startPage") ?: 0
            MainScreen(
                navController = navController,
                onLogout = { viewModel.logout() },
                onNavigateToCreateWorkflow = { navController.navigate(Screen.CreateWorkflow.route) },
                initialPage = startPage
            )
        }
        composable(Screen.CreateWorkflow.route) {
            CreateWorkflowScreen(
                navController = navController,
                onBack = { navController.popBackStack() }
            )
        }
    }
}
