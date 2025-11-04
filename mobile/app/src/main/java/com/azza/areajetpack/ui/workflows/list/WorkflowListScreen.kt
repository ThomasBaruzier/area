package com.azza.areajetpack.ui.workflows.list

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshContainer
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.azza.areajetpack.R
import com.azza.areajetpack.domain.model.Workflow
import com.azza.areajetpack.ui.common.SearchBar
import com.azza.areajetpack.ui.common.UiState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkflowListScreen(
    mainNavController: NavHostController,
    onNavigateToCreate: () -> Unit,
    viewModel: WorkflowListViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val workflowToDelete by viewModel.workflowToDelete.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val pullRefreshState = rememberPullToRefreshState()

    val savedStateHandle = mainNavController.currentBackStackEntry?.savedStateHandle
    LaunchedEffect(savedStateHandle) {
        if (savedStateHandle?.remove<Boolean>("workflow_created") == true) {
            viewModel.refresh()
        }
    }

    if (pullRefreshState.isRefreshing) {
        LaunchedEffect(true) {
            viewModel.refresh()
        }
    }

    LaunchedEffect(isRefreshing) {
        if (!isRefreshing) {
            pullRefreshState.endRefresh()
        }
    }

    workflowToDelete?.let { workflow ->
        AlertDialog(
            onDismissRequest = { viewModel.onDeleteDismiss() },
            title = { Text(stringResource(R.string.delete_workflow_dialog_title)) },
            text = { Text(stringResource(R.string.delete_workflow_dialog_text, workflow.actionName)) },
            confirmButton = {
                TextButton(
                    onClick = { viewModel.onDeleteConfirm(workflow.id) },
                    colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)
                ) {
                    Text(stringResource(R.string.delete_button))
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.onDeleteDismiss() }) {
                    Text(stringResource(R.string.cancel_button))
                }
            }
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .nestedScroll(pullRefreshState.nestedScrollConnection)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp)
        ) {
            SearchBar(
                query = searchQuery,
                onQueryChange = viewModel::onSearchQueryChange,
                placeholder = "Search workflows...",
                modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)
            )

            when (val state = uiState) {
                is UiState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
                is UiState.Success -> {
                    if (state.data.isEmpty()) {
                        val emptyText = if (searchQuery.isNotEmpty()) "No workflows match your search." else stringResource(id = R.string.workflows_empty_state)
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Top
                        ) {
                            Text(
                                text = emptyText,
                                style = MaterialTheme.typography.bodyLarge,
                                textAlign = TextAlign.Center
                            )
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(top = 8.dp, bottom = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(state.data) { workflow ->
                                WorkflowCard(
                                    workflow = workflow,
                                    onDelete = { viewModel.onDeleteRequest(workflow) },
                                    onToggle = { isEnabled -> viewModel.onToggleWorkflow(workflow.id, isEnabled) }
                                )
                            }
                        }
                    }
                }
                is UiState.Error -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            text = state.message,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(16.dp),
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }
        PullToRefreshContainer(
            modifier = Modifier.align(Alignment.TopCenter),
            state = pullRefreshState
        )
    }
}

@Composable
fun WorkflowCard(workflow: Workflow, onDelete: () -> Unit, onToggle: (Boolean) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    val reactionServices = workflow.reactionServiceNames.distinct().joinToString(" & ")
                    val title = "${workflow.actionServiceName} → $reactionServices"
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleLarge,
                        modifier = Modifier
                            .weight(1f)
                            .padding(end = 12.dp)
                    )
                    Switch(
                        checked = workflow.isEnabled,
                        onCheckedChange = onToggle
                    )
                }
                Spacer(Modifier.height(16.dp))

                Column {
                    Text(
                        stringResource(R.string.workflow_card_when_label).uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(workflow.actionName, style = MaterialTheme.typography.bodyLarge)
                }

                Spacer(Modifier.height(12.dp))

                if (workflow.reactionNames.isNotEmpty()) {
                    Column {
                        Text(
                            stringResource(R.string.workflow_card_then_label).uppercase(),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.height(4.dp))
                        workflow.reactionNames.forEach { reactionName ->
                            Text("• $reactionName", style = MaterialTheme.typography.bodyLarge)
                        }
                    }
                }
            }

            IconButton(
                onClick = onDelete,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(4.dp)
            ) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = stringResource(R.string.delete_button),
                    tint = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}
