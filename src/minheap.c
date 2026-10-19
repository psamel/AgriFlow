#include "minheap.h"
#include "plotpool.h"
#include <stdio.h>
#include <stdlib.h>
#include <math.h>

int parentIdx(int i) {
    return (i - 1) / 2;
}

int leftIdx(int i) {
    return 2 * i + 1;
}

int rightIdx(int i) {
    return 2 * i + 2;
}

void swapItems(HeapItem *a, HeapItem *b) {
    HeapItem tmp = *a;
    *a = *b;
    *b = tmp;
}

int isHigherPriority(const HeapItem *a, const HeapItem *b) {
    if (!a || !b) return 0;

    /* Primary criterion: lower score => higher urgency */
    double diff = a->score - b->score;
    if (diff < -1e-9) {
        return 1;
    }
    if (diff > 1e-9) {
        return 0;
    }

    /* Deterministic tie-breaker: lower plot ID */
    int idA = 0, idB = 0;
    if (a->plotIndex >= 0 && a->plotIndex < plotPoolCount) {
        idA = plotPool[a->plotIndex].plotId;
    }
    if (b->plotIndex >= 0 && b->plotIndex < plotPoolCount) {
        idB = plotPool[b->plotIndex].plotId;
    }

    return (idA < idB);
}

MinHeap *createMinHeap(int capacity) {
    if (capacity <= 0) capacity = 64;
    if (capacity > MAX_PLOTS) capacity = MAX_PLOTS;

    MinHeap *heap = (MinHeap *)malloc(sizeof(MinHeap));
    if (!heap) return NULL;

    heap->items = (HeapItem *)malloc(sizeof(HeapItem) * capacity);
    if (!heap->items) {
        free(heap);
        return NULL;
    }

    heap->size = 0;
    heap->capacity = capacity;
    return heap;
}

int initMinHeap(MinHeap *heap, int capacity) {
    if (!heap) return 0;
    if (capacity <= 0) capacity = 64;
    if (capacity > MAX_PLOTS) capacity = MAX_PLOTS;

    heap->items = (HeapItem *)malloc(sizeof(HeapItem) * capacity);
    if (!heap->items) {
        heap->size = 0;
        heap->capacity = 0;
        return 0;
    }

    heap->size = 0;
    heap->capacity = capacity;
    return 1;
}

void push(MinHeap *heap, int plotIndex, double score) {
    if (!heap || plotIndex < 0 || plotIndex >= plotPoolCount) {
        return;
    }

    /* Dynamically expand capacity if required up to MAX_PLOTS */
    if (heap->size >= heap->capacity) {
        if (heap->capacity >= MAX_PLOTS) {
            return; /* Cannot exceed system maximum */
        }
        int newCap = heap->capacity * 2;
        if (newCap > MAX_PLOTS) newCap = MAX_PLOTS;

        HeapItem *newItems = (HeapItem *)realloc(heap->items, sizeof(HeapItem) * newCap);
        if (!newItems) {
            return; /* Reallocation failure */
        }
        heap->items = newItems;
        heap->capacity = newCap;
    }

    int i = heap->size++;
    heap->items[i].plotIndex = plotIndex;
    heap->items[i].score     = score;

    /* Sift-up step to restore min-heap property: O(log n) */
    while (i > 0 && isHigherPriority(&heap->items[i], &heap->items[parentIdx(i)])) {
        swapItems(&heap->items[parentIdx(i)], &heap->items[i]);
        i = parentIdx(i);
    }
}

int extractMin(MinHeap *heap) {
    if (!heap || heap->size <= 0) {
        return -1; /* Safe sentinel for empty heap */
    }

    int topIndex = heap->items[0].plotIndex;

    /* Move last element to root and reduce size */
    heap->size--;
    if (heap->size > 0) {
        heap->items[0] = heap->items[heap->size];

        /* Sift-down step to restore min-heap property: O(log n) */
        int i = 0;
        while (1) {
            int smallest = i;
            int l = leftIdx(i);
            int r = rightIdx(i);

            if (l < heap->size && isHigherPriority(&heap->items[l], &heap->items[smallest])) {
                smallest = l;
            }
            if (r < heap->size && isHigherPriority(&heap->items[r], &heap->items[smallest])) {
                smallest = r;
            }

            if (smallest == i) {
                break;
            }

            swapItems(&heap->items[i], &heap->items[smallest]);
            i = smallest;
        }
    }

    return topIndex;
}

int isHeapEmpty(const MinHeap *heap) {
    return (!heap || heap->size <= 0);
}

int getHeapSize(const MinHeap *heap) {
    return heap ? heap->size : 0;
}

void freeMinHeap(MinHeap *heap) {
    if (!heap) return;
    if (heap->items) {
        free(heap->items);
        heap->items = NULL;
    }
    heap->size = 0;
    heap->capacity = 0;
    free(heap);
}
