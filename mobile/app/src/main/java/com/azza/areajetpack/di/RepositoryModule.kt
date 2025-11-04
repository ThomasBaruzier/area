package com.azza.areajetpack.di

import com.azza.areajetpack.data.repository.AuthRepositoryImpl
import com.azza.areajetpack.data.repository.MetadataRepositoryImpl
import com.azza.areajetpack.data.repository.SettingsRepositoryImpl
import com.azza.areajetpack.data.repository.WorkflowRepositoryImpl
import com.azza.areajetpack.domain.repository.AuthRepository
import com.azza.areajetpack.domain.repository.MetadataRepository
import com.azza.areajetpack.domain.repository.SettingsRepository
import com.azza.areajetpack.domain.repository.WorkflowRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindAuthRepository(impl: AuthRepositoryImpl): AuthRepository

    @Binds
    @Singleton
    abstract fun bindWorkflowRepository(impl: WorkflowRepositoryImpl): WorkflowRepository

    @Binds
    @Singleton
    abstract fun bindSettingsRepository(impl: SettingsRepositoryImpl): SettingsRepository

    @Binds
    @Singleton
    abstract fun bindMetadataRepository(impl: MetadataRepositoryImpl): MetadataRepository
}
