package com.azza.areajetpack.data.network

import com.azza.areajetpack.data.network.dto.ActionReactionDto
import com.azza.areajetpack.data.network.dto.AuthRequest
import com.azza.areajetpack.data.network.dto.AuthResponse
import com.azza.areajetpack.data.network.dto.CreateUserDto
import com.azza.areajetpack.data.network.dto.CreateWorkflowRequest
import com.azza.areajetpack.data.network.dto.ServiceDto
import com.azza.areajetpack.data.network.dto.UpdateWorkflowRequest
import com.azza.areajetpack.data.network.dto.UserDto
import com.azza.areajetpack.data.network.dto.WorkflowDto
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

interface ApiService {

    @POST("api/user/register")
    suspend fun register(@Body request: CreateUserDto): UserDto

    @POST("api/user/login")
    suspend fun login(@Body request: AuthRequest): AuthResponse

    @GET("api/user/connections")
    suspend fun getConnections(): List<String>

    @GET("api/services")
    suspend fun getServices(): List<ServiceDto>

    @GET("api/actions/{serviceId}")
    suspend fun getActions(@Path("serviceId") serviceId: Int): List<ActionReactionDto>

    @GET("api/reactions/{serviceId}")
    suspend fun getReactions(@Path("serviceId") serviceId: Int): List<ActionReactionDto>

    @GET("api/workflow/list")
    suspend fun getWorkflows(): List<WorkflowDto>

    @POST("api/workflow/create")
    suspend fun createWorkflow(@Body workflow: CreateWorkflowRequest): WorkflowDto

    @DELETE("api/workflow/delete/{id}")
    suspend fun deleteWorkflow(@Path("id") workflowId: Int): WorkflowDto

    @PATCH("api/workflow/edit/{id}")
    suspend fun updateWorkflow(@Path("id") workflowId: Int, @Body request: UpdateWorkflowRequest): WorkflowDto
}
