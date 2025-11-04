package com.azza.areajetpack.di

import com.azza.areajetpack.util.BaseUrlHolder
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DynamicBaseUrlInterceptor @Inject constructor(
    private val baseUrlHolder: BaseUrlHolder
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        val newUrl = try {
            val currentHttpUrl = baseUrlHolder.currentUrl.toHttpUrl()
            originalRequest.url.newBuilder()
                .scheme(currentHttpUrl.scheme)
                .host(currentHttpUrl.host)
                .port(currentHttpUrl.port)
                .build()
        } catch (e: IllegalArgumentException) {
            originalRequest.url
        }

        val newRequest = originalRequest.newBuilder()
            .url(newUrl)
            .build()

        return chain.proceed(newRequest)
    }
}
