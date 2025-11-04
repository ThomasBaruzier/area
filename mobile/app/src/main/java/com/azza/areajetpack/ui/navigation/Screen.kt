package com.azza.areajetpack.ui.navigation

import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountTree
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.ui.graphics.vector.ImageVector
import com.azza.areajetpack.R

sealed class Screen(val route: String, @StringRes val titleResId: Int, val icon: ImageVector? = null) {
    object Splash : Screen("splash", R.string.app_name)
    object Auth : Screen("auth", R.string.login_title)
    object Settings : Screen("settings", R.string.settings_title)
    object Main : Screen("main/{startPage}", R.string.app_name) {
        fun createRoute(startPage: Int): String = "main/$startPage"
    }
    object Workflows : Screen("workflows", R.string.workflows_title, Icons.Default.AccountTree)
    object Services : Screen("services", R.string.services_title, Icons.Default.Dashboard)
    object CreateWorkflow : Screen("create_workflow", R.string.create_workflow_title)
}
