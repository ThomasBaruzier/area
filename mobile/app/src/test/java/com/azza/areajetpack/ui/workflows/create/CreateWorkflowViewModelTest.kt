package com.azza.areajetpack.ui.workflows.create

import app.cash.turbine.test
import com.azza.areajetpack.MainDispatcherRule
import com.azza.areajetpack.domain.model.ActionReactionItem
import com.azza.areajetpack.domain.model.ConfiguredAction
import com.azza.areajetpack.domain.model.ConfiguredReaction
import com.azza.areajetpack.domain.model.Service
import com.azza.areajetpack.domain.model.WorkflowPayload
import com.azza.areajetpack.domain.usecase.*
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@ExperimentalCoroutinesApi
class CreateWorkflowViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var getServicesUseCase: GetServicesUseCase
    private lateinit var getActionsForServiceUseCase: GetActionsForServiceUseCase
    private lateinit var getReactionsForServiceUseCase: GetReactionsForServiceUseCase
    private lateinit var createWorkflowUseCase: CreateWorkflowUseCase
    private lateinit var getConnectionsUseCase: GetConnectionsUseCase
    private lateinit var viewModel: CreateWorkflowViewModel

    private val mockServices = listOf(Service(1, "GitHub", ""), Service(2, "Google", ""))
    private val mockConnections = listOf("github")
    private val mockActions = listOf(ActionReactionItem(10, "New Commit", listOf("repo")))
    private val mockReactions = listOf(ActionReactionItem(20, "Send Email", listOf("to")))

    @Before
    fun setUp() {
        getServicesUseCase = mockk()
        getActionsForServiceUseCase = mockk()
        getReactionsForServiceUseCase = mockk()
        createWorkflowUseCase = mockk()
        getConnectionsUseCase = mockk()

        coEvery { getServicesUseCase() } returns Result.success(mockServices)
        coEvery { getConnectionsUseCase() } returns Result.success(mockConnections)
        coEvery { getActionsForServiceUseCase(1, false) } returns Result.success(mockActions)
        coEvery { getReactionsForServiceUseCase(2, false) } returns Result.success(mockReactions)
        coEvery { createWorkflowUseCase(any()) } returns Result.success(Unit)

        viewModel = CreateWorkflowViewModel(
            getServicesUseCase,
            getActionsForServiceUseCase,
            getReactionsForServiceUseCase,
            createWorkflowUseCase,
            getConnectionsUseCase
        )
    }

    @Test
    fun `createWorkflow calls use case with correct payload`() = runTest {
        val actionServiceId = 1
        val actionId = 10
        val reactionServiceId = 2
        val reactionId = 20
        val actionFields = mapOf("repo" to "test/repo")
        val reactionFields = mapOf("to" to "test@example.com")
        coEvery { createWorkflowUseCase(any()) } returns Result.success(Unit)

        viewModel.loadInitialData()
        viewModel.onActionServiceSelected(actionServiceId)
        viewModel.onActionSelected(actionId)
        actionFields.forEach { (key, value) -> viewModel.onActionFieldChanged(key, value) }
        viewModel.onActionConfigured()
        viewModel.onReactionServiceSelected(reactionServiceId)
        viewModel.onReactionSelected(reactionId)
        reactionFields.forEach { (key, value) -> viewModel.onReactionFieldChanged(key, value) }
        viewModel.onReactionConfigured()

        val expectedPayload = WorkflowPayload(
            action = ConfiguredAction(actionServiceId, actionId, actionFields),
            reactions = listOf(ConfiguredReaction(reactionServiceId, reactionId, reactionFields))
        )
        viewModel.createWorkflow()
        coVerify { createWorkflowUseCase(expectedPayload) }

        assertTrue(viewModel.uiState.value.isSuccess)
    }


    @Test
    fun `filteredServices only shows connected services`() = runTest {
        viewModel.loadInitialData()
        viewModel.filteredServices.test {
            val services = awaitItem()
            assertEquals(1, services.size)
            assertEquals("GitHub", services.first().name)
        }
    }
}
