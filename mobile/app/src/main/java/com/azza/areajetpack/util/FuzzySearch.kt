package com.azza.areajetpack.util

object FuzzySearch {
    fun <T> searchByWords(query: String, items: List<T>, keySelector: (T) -> String): List<T> {
        if (query.isBlank()) {
            return items
        }
        val queryWords = query.lowercase().split(' ').filter { it.isNotEmpty() }
        if (queryWords.isEmpty()) {
            return items
        }

        return items.filter { item ->
            val targetWords = keySelector(item).lowercase().split(' ').filter { it.isNotEmpty() }
            var currentTargetIndex = 0
            for (queryWord in queryWords) {
                var found = false
                while (currentTargetIndex < targetWords.size) {
                    if (targetWords[currentTargetIndex].startsWith(queryWord)) {
                        found = true
                        currentTargetIndex++
                        break
                    }
                    currentTargetIndex++
                }
                if (!found) {
                    return@filter false
                }
            }
            true
        }
    }
}
