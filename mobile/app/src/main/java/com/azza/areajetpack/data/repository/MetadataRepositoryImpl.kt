package com.azza.areajetpack.data.repository

import com.azza.areajetpack.data.network.ApiService
import com.azza.areajetpack.domain.model.ActionReactionItem
import com.azza.areajetpack.domain.model.Service
import com.azza.areajetpack.domain.repository.MetadataRepository
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MetadataRepositoryImpl @Inject constructor(
    private val apiService: ApiService
) : MetadataRepository {

    private var servicesCache: List<Service>? = null
    private val actionsCache = mutableMapOf<Int, List<ActionReactionItem>>()
    private val reactionsCache = mutableMapOf<Int, List<ActionReactionItem>>()

    private val mutex = Mutex()

    override suspend fun getActionName(serviceId: Int, actionId: Int): String {
        val actions = getActionsForService(serviceId)
        return actions.find { it.id == actionId }?.name ?: "Action $actionId"
    }

    override suspend fun getReactionName(serviceId: Int, reactionId: Int): String {
        val reactions = getReactionsForService(serviceId)
        return reactions.find { it.id == reactionId }?.name ?: "Reaction $reactionId"
    }

    override suspend fun getServiceName(serviceId: Int): String {
        val services = getServices()
        return services.find { it.id == serviceId }?.name ?: "Service $serviceId"
    }

    override suspend fun getServices(forceRefresh: Boolean): List<Service> {
        if (!forceRefresh) {
            servicesCache?.let { return it }
        }
        return mutex.withLock {
            if (!forceRefresh) {
                servicesCache?.let { return it }
            }
            val serviceDtos = apiService.getServices()
            val serviceModels = serviceDtos.map { Service(it.id, it.name, it.description) }
            servicesCache = serviceModels
            serviceModels
        }
    }

    override suspend fun getActionsForService(serviceId: Int, forceRefresh: Boolean): List<ActionReactionItem> {
        if (!forceRefresh) {
            actionsCache[serviceId]?.let { return it }
        }
        return mutex.withLock {
            if (!forceRefresh) {
                actionsCache[serviceId]?.let { return it }
            }
            val actionDtos = apiService.getActions(serviceId)
            val items = actionDtos.map { ActionReactionItem(it.id, it.name, it.jsonFormat.keys.toList()) }
            actionsCache[serviceId] = items
            items
        }
    }

    override suspend fun getReactionsForService(serviceId: Int, forceRefresh: Boolean): List<ActionReactionItem> {
        if (!forceRefresh) {
            reactionsCache[serviceId]?.let { return it }
        }
        return mutex.withLock {
            if (!forceRefresh) {
                reactionsCache[serviceId]?.let { return it }
            }
            val reactionDtos = apiService.getReactions(serviceId)
            val items = reactionDtos.map { ActionReactionItem(it.id, it.name, it.jsonFormat.keys.toList()) }
            reactionsCache[serviceId] = items
            items
        }
    }
}
