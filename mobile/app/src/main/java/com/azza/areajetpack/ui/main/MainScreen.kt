package com.azza.areajetpack.ui.main

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavHostController
import com.azza.areajetpack.R
import com.azza.areajetpack.ui.navigation.Screen
import com.azza.areajetpack.ui.services.ServiceListScreen
import com.azza.areajetpack.ui.workflows.list.WorkflowListScreen
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun MainScreen(
    navController: NavHostController,
    onLogout: () -> Unit,
    onNavigateToCreateWorkflow: () -> Unit,
    initialPage: Int = 0
) {
    val bottomNavItems = listOf(Screen.Workflows, Screen.Services)
    val pagerState = rememberPagerState(initialPage = initialPage, pageCount = { bottomNavItems.size })
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(initialPage) {
        if (pagerState.currentPage != initialPage) {
            pagerState.scrollToPage(initialPage)
        }
    }

    Scaffold(
        topBar = {
            val currentScreen = bottomNavItems[pagerState.currentPage]
            TopAppBar(
                title = { Text(stringResource(currentScreen.titleResId)) },
                actions = {
                    IconButton(onClick = onLogout) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = stringResource(R.string.logout_button_desc))
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar {
                bottomNavItems.forEachIndexed { index, screen ->
                    NavigationBarItem(
                        icon = { Icon(screen.icon!!, contentDescription = null) },
                        label = { Text(stringResource(screen.titleResId)) },
                        selected = pagerState.currentPage == index,
                        onClick = {
                            coroutineScope.launch {
                                pagerState.animateScrollToPage(index)
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.onPrimary,
                            indicatorColor = MaterialTheme.colorScheme.primary
                        )
                    )
                }
            }
        },
        floatingActionButton = {
            if (pagerState.currentPage == bottomNavItems.indexOf(Screen.Workflows)) {
                FloatingActionButton(
                    onClick = onNavigateToCreateWorkflow,
                    containerColor = MaterialTheme.colorScheme.primary
                ) {
                    Icon(Icons.Default.Add, contentDescription = stringResource(R.string.create_workflow_button_desc))
                }
            }
        }
    ) { innerPadding ->
        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
        ) { page ->
            when (page) {
                0 -> WorkflowListScreen(
                    mainNavController = navController,
                    onNavigateToCreate = onNavigateToCreateWorkflow
                )
                1 -> ServiceListScreen()
            }
        }
    }
}
