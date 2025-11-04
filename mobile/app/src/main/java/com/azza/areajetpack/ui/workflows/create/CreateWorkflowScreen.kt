package com.azza.areajetpack.ui.workflows.create

import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.azza.areajetpack.R
import com.azza.areajetpack.domain.model.ActionReactionItem
import com.azza.areajetpack.domain.model.Service
import com.azza.areajetpack.ui.common.SearchBar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateWorkflowScreen(
    navController: NavHostController,
    onBack: () -> Unit,
    viewModel: CreateWorkflowViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val filteredServices by viewModel.filteredServices.collectAsState()
    val hasConnectedServices by viewModel.hasConnectedServices.collectAsState()
    val filteredActions by viewModel.filteredActions.collectAsState()
    val filteredReactions by viewModel.filteredReactions.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadInitialData()
    }

    BackHandler {
        if (uiState.currentStep == WizardStep.SELECT_ACTION_SERVICE) {
            onBack()
        } else {
            viewModel.onBack()
        }
    }

    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) {
            navController.previousBackStackEntry
                ?.savedStateHandle
                ?.set("workflow_created", true)
            onBack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(id = R.string.create_workflow_title)) },
                navigationIcon = {
                    IconButton(onClick = {
                        if (uiState.currentStep == WizardStep.SELECT_ACTION_SERVICE) onBack() else viewModel.onBack()
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(id = R.string.back_button_desc))
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            WizardProgress(
                currentStep = uiState.currentStep.ordinal,
                totalSteps = WizardStep.entries.size
            )
            Spacer(Modifier.height(8.dp))

            Box(modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp)) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }

                AnimatedContent(
                    targetState = uiState.currentStep,
                    transitionSpec = {
                        if (targetState.ordinal > initialState.ordinal) {
                            slideInHorizontally { width -> width } togetherWith slideOutHorizontally { width -> -width }
                        } else {
                            slideInHorizontally { width -> -width } togetherWith slideOutHorizontally { width -> width }
                        }
                    }, label = "wizard_animation"
                ) { step ->
                    Column {
                        if (uiState.error != null) {
                            Text(
                                uiState.error!!,
                                color = MaterialTheme.colorScheme.error,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 8.dp),
                                textAlign = TextAlign.Center
                            )
                        }
                        when (step) {
                            WizardStep.SELECT_ACTION_SERVICE -> ServiceSelectionStep(
                                services = filteredServices,
                                hasConnectedServices = hasConnectedServices,
                                onSelect = { viewModel.onActionServiceSelected(it.id) },
                                title = stringResource(R.string.wizard_step1_title),
                                searchQuery = uiState.searchQuery,
                                onSearchQueryChange = viewModel::onSearchQueryChange
                            )
                            WizardStep.SELECT_ACTION -> ActionReactionSelectionStep(
                                items = filteredActions,
                                onSelect = { viewModel.onActionSelected(it.id) },
                                title = stringResource(R.string.wizard_step2_title),
                                searchQuery = uiState.searchQuery,
                                onSearchQueryChange = viewModel::onSearchQueryChange
                            )
                            WizardStep.CONFIGURE_ACTION -> ConfigurationStep(
                                title = stringResource(R.string.wizard_step3_title),
                                item = uiState.selectedAction!!,
                                fields = uiState.actionFields,
                                onFieldChange = viewModel::onActionFieldChanged,
                                onContinue = { viewModel.onActionConfigured() }
                            )
                            WizardStep.SELECT_REACTION_SERVICE -> ServiceSelectionStep(
                                services = filteredServices,
                                hasConnectedServices = hasConnectedServices,
                                onSelect = { viewModel.onReactionServiceSelected(it.id) },
                                title = stringResource(R.string.wizard_step4_title),
                                searchQuery = uiState.searchQuery,
                                onSearchQueryChange = viewModel::onSearchQueryChange
                            )
                            WizardStep.SELECT_REACTION -> ActionReactionSelectionStep(
                                items = filteredReactions,
                                onSelect = { viewModel.onReactionSelected(it.id) },
                                title = stringResource(R.string.wizard_step5_title),
                                searchQuery = uiState.searchQuery,
                                onSearchQueryChange = viewModel::onSearchQueryChange
                            )
                            WizardStep.CONFIGURE_REACTION -> ConfigurationStep(
                                title = stringResource(R.string.wizard_step6_title),
                                item = uiState.selectedReaction!!,
                                fields = uiState.reactionFields,
                                onFieldChange = viewModel::onReactionFieldChanged,
                                onContinue = { viewModel.onReactionConfigured() }
                            )
                            WizardStep.REVIEW -> ReviewStep(
                                state = uiState,
                                onSave = { viewModel.createWorkflow() }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun WizardProgress(currentStep: Int, totalSteps: Int) {
    val progress = (currentStep + 1) / totalSteps.toFloat()
    Column {
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = stringResource(R.string.wizard_step_indicator, currentStep + 1, totalSteps),
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            textAlign = TextAlign.End
        )
    }
}

@Composable
private fun ServiceSelectionStep(
    services: List<Service>,
    hasConnectedServices: Boolean,
    onSelect: (Service) -> Unit,
    title: String,
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit
) {
    Column {
        Text(title, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(bottom = 8.dp, top = 8.dp))
        SearchBar(
            query = searchQuery,
            onQueryChange = onSearchQueryChange,
            placeholder = "Search...",
            modifier = Modifier.padding(top = 8.dp, bottom = 16.dp)
        )
        if (!hasConnectedServices) {
            Text(
                "No connected services found. Please connect a service from the Services tab first.",
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                textAlign = TextAlign.Center
            )
        } else if (services.isEmpty()) {
            Text("No results found.", modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp), textAlign = TextAlign.Center)
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(bottom = 16.dp)) {
                items(services) { service ->
                    Card(
                        onClick = { onSelect(service) },
                        modifier = Modifier.fillMaxWidth(),
                        elevation = CardDefaults.cardElevation(2.dp)
                    ) {
                        Text(
                            text = service.name,
                            style = MaterialTheme.typography.titleMedium,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ActionReactionSelectionStep(items: List<ActionReactionItem>, onSelect: (ActionReactionItem) -> Unit, title: String, searchQuery: String, onSearchQueryChange: (String) -> Unit) {
    Column {
        Text(title, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(bottom = 8.dp, top = 8.dp))
        SearchBar(
            query = searchQuery,
            onQueryChange = onSearchQueryChange,
            placeholder = "Search...",
            modifier = Modifier.padding(top = 8.dp, bottom = 16.dp)
        )
        if (items.isEmpty()) {
            Text("No results found.", modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp), textAlign = TextAlign.Center)
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(bottom = 16.dp)) {
                items(items) { item ->
                    Card(
                        onClick = { onSelect(item) },
                        modifier = Modifier.fillMaxWidth(),
                        elevation = CardDefaults.cardElevation(2.dp)
                    ) {
                        Text(
                            text = item.name,
                            style = MaterialTheme.typography.titleMedium,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ConfigurationStep(
    title: String,
    item: ActionReactionItem,
    fields: Map<String, String>,
    onFieldChange: (String, String) -> Unit,
    onContinue: () -> Unit
) {
    val focusManager = LocalFocusManager.current
    Column {
        Text(title, style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(8.dp))
        Text(item.name, style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(16.dp))

        if (item.fields.isEmpty()) {
            Text(
                text = stringResource(R.string.no_configurable_fields),
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(vertical = 16.dp)
            )
        } else {
            item.fields.forEachIndexed { index, fieldName ->
                val isLast = index == item.fields.size - 1
                OutlinedTextField(
                    value = fields[fieldName] ?: "",
                    onValueChange = { onFieldChange(fieldName, it) },
                    label = { Text(fieldName.replaceFirstChar { it.uppercase() }) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = if (isLast) ImeAction.Done else ImeAction.Next),
                    keyboardActions = KeyboardActions(
                        onNext = { focusManager.moveFocus(FocusDirection.Down) },
                        onDone = { onContinue() }
                    )
                )
                Spacer(Modifier.height(8.dp))
            }
        }

        Spacer(Modifier.height(16.dp))
        Button(onClick = onContinue, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(id = R.string.continue_button))
        }
    }
}


@Composable
private fun ReviewStep(state: CreateWorkflowState, onSave: () -> Unit) {
    Column {
        Text(stringResource(R.string.wizard_step7_title), style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(16.dp))
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text(stringResource(R.string.review_action_label), style = MaterialTheme.typography.titleMedium)
                Text(state.selectedAction?.name ?: "", style = MaterialTheme.typography.bodyLarge)
                state.actionFields.forEach { (key, value) ->
                    Text("  • $key: $value", style = MaterialTheme.typography.bodyMedium)
                }
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                Text(stringResource(R.string.review_reaction_label), style = MaterialTheme.typography.titleMedium)
                Text(state.selectedReaction?.name ?: "", style = MaterialTheme.typography.bodyLarge)
                state.reactionFields.forEach { (key, value) ->
                    Text("  • $key: $value", style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
        Spacer(Modifier.height(32.dp))
        Button(onClick = onSave, enabled = !state.isLoading, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.save_workflow_button))
        }
    }
}
