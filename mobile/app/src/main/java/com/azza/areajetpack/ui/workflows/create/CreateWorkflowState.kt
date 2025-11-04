package com.azza.areajetpack.ui.workflows.create

import com.azza.areajetpack.domain.model.ActionReactionItem
import com.azza.areajetpack.domain.model.Service

enum class WizardStep {
    SELECT_ACTION_SERVICE,
    SELECT_ACTION,
    CONFIGURE_ACTION,
    SELECT_REACTION_SERVICE,
    SELECT_REACTION,
    CONFIGURE_REACTION,
    REVIEW
}

data class CreateWorkflowState(
    val currentStep: WizardStep = WizardStep.SELECT_ACTION_SERVICE,
    val services: List<Service> = emptyList(),
    val connectedServiceNames: Set<String> = emptySet(),
    val actions: List<ActionReactionItem> = emptyList(),
    val reactions: List<ActionReactionItem> = emptyList(),
    val selectedActionServiceId: Int? = null,
    val selectedAction: ActionReactionItem? = null,
    val actionFields: Map<String, String> = emptyMap(),
    val selectedReactionServiceId: Int? = null,
    val selectedReaction: ActionReactionItem? = null,
    val reactionFields: Map<String, String> = emptyMap(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSuccess: Boolean = false,
    val searchQuery: String = ""
)
