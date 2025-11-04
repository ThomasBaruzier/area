package com.azza.areajetpack.util

import retrofit2.HttpException
import java.io.IOException

object UiErrorHandler {
    fun handleError(throwable: Throwable): String {
        return when (throwable) {
            is IOException -> "Network error. Please check your connection."
            is HttpException -> {
                when (throwable.code()) {
                    400 -> "Invalid request. Please check your input."
                    401 -> "Unauthorized. Please log in again."
                    403 -> "Forbidden. You don't have permission."
                    404 -> "Resource not found."
                    500 -> "Server error. Please try again later."
                    else -> "An unexpected error occurred."
                }
            }
            else -> throwable.message ?: "An unknown error occurred."
        }
    }
}
