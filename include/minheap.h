#ifndef AGRIFLOW_MINHEAP_H
#define AGRIFLOW_MINHEAP_H

#include "types.h"

/**
 * Helper index navigation functions conforming to design document signatures.
 */
int parentIdx(int i);
int leftIdx(int i);
int rightIdx(int i);

/**
 * Swaps two HeapItem records.
 */
void swapItems(HeapItem *a, HeapItem *b);

/**
 * Determines whether item 'a' has strictly higher irrigation priority than item 'b'.
 * Priority Rule: Lower urgency score is more urgent.
 * Tie-breaker: If scores are equal, lower plot ID takes precedence for deterministic ordering.
 */
int isHigherPriority(const HeapItem *a, const HeapItem *b);

/**
 * Allocates and initializes a MinHeap with specified dynamic capacity (up to MAX_PLOTS).
 * Returns NULL on allocation failure.
 */
MinHeap *createMinHeap(int capacity);

/**
 * Initializes an existing MinHeap structure with a dynamically allocated item buffer.
 * Returns 1 on success, 0 on allocation failure.
 */
int initMinHeap(MinHeap *heap, int capacity);

/**
 * Pushes a plot index and its urgency score into the min-heap.
 * Restores the min-heap property via sift-up in O(log n).
 * Safely expands heap capacity if needed, avoiding buffer overflow.
 */
void push(MinHeap *heap, int plotIndex, double score);

/**
 * Extracts and returns the index of the plot with the lowest urgency score (highest priority).
 * Restores the min-heap property via sift-down in O(log n).
 * Returns -1 safely if the heap is empty.
 */
int extractMin(MinHeap *heap);

/**
 * Checks if the heap is currently empty.
 */
int isHeapEmpty(const MinHeap *heap);

/**
 * Returns the current number of elements in the heap.
 */
int getHeapSize(const MinHeap *heap);

/**
 * Releases memory allocated for the heap items and frees the heap structure.
 */
void freeMinHeap(MinHeap *heap);

#endif /* AGRIFLOW_MINHEAP_H */
