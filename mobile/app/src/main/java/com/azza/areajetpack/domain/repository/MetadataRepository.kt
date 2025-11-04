package com.azza.areajetpack.domain.repository

import com.azza.areajetpack.domain.model.ActionReactionItem
import com.azza.areajetpack.domain.model.Service

interface MetadataRepository {
    suspend fun getActionName(serviceId: Int, actionId: Int): String
    suspend fun getReactionName(serviceId: Int, reactionId: Int): String
    suspend fun getServiceName(serviceId: Int): String
    suspend fun getServices(forceRefresh: Boolean = false): List<Service>
    suspend fun getActionsForService(serviceId: Int, forceRefresh: Boolean = false): List<ActionReactionItem>
    suspend fun getReactionsForService(serviceId: Int, forceRefresh: Boolean = false): List<ActionReactionItem>
}
