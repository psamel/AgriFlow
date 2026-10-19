#include "hashmap.h"
#include "plotpool.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void initHashMap(PlotHashMap *map) {
    if (!map) return;
    for (int i = 0; i < HASH_TABLE_SIZE; i++) {
        map->buckets[i] = NULL;
    }
    map->count = 0;
}

unsigned int hashPlotId(int plotId) {
    /* Multiplicative hashing (Knuth's Fibonacci hash) */
    unsigned int id = (unsigned int)plotId;
    return (id * 2654435761u) % HASH_TABLE_SIZE;
}

int insertPlotId(PlotHashMap *map, int plotId, int plotIndex) {
    if (!map || plotId <= 0 || plotIndex < 0 || plotIndex >= plotPoolCount) {
        return -1;
    }

    unsigned int h = hashPlotId(plotId);
    HashNode *cur = map->buckets[h];

    /* Reject duplicate plot IDs */
    while (cur != NULL) {
        if (cur->plotId == plotId) {
            return 0; /* Duplicate ID rejected */
        }
        cur = cur->next;
    }

    HashNode *node = (HashNode *)malloc(sizeof(HashNode));
    if (!node) {
        return -1; /* Allocation failure */
    }

    node->plotId    = plotId;
    node->plotIndex = plotIndex;
    node->next      = map->buckets[h];
    map->buckets[h] = node;
    map->count++;

    return 1; /* Successfully inserted */
}

void insertOrUpdate(PlotHashMap *map, int plotId, int plotIndex) {
    if (!map || plotId <= 0 || plotIndex < 0 || plotIndex >= plotPoolCount) {
        return;
    }

    unsigned int h = hashPlotId(plotId);
    HashNode *cur = map->buckets[h];

    while (cur != NULL) {
        if (cur->plotId == plotId) {
            cur->plotIndex = plotIndex;
            return;
        }
        cur = cur->next;
    }

    HashNode *node = (HashNode *)malloc(sizeof(HashNode));
    if (!node) return;

    node->plotId    = plotId;
    node->plotIndex = plotIndex;
    node->next      = map->buckets[h];
    map->buckets[h] = node;
    map->count++;
}

int lookupPlotIndex(const PlotHashMap *map, int plotId) {
    if (!map || plotId <= 0) {
        return -1;
    }

    unsigned int h = hashPlotId(plotId);
    HashNode *cur = map->buckets[h];

    while (cur != NULL) {
        if (cur->plotId == plotId) {
            int idx = cur->plotIndex;
            if (idx >= 0 && idx < plotPoolCount && plotPool[idx].active) {
                return idx;
            }
            return -1; /* Found but marked inactive / deleted */
        }
        cur = cur->next;
    }

    return -1; /* Plot ID not found */
}

void applySensorReading(PlotHashMap *map, int plotId, double moisture, double rainForecastMM) {
    int idx = lookupPlotIndex(map, plotId);
    if (idx == -1) {
        return; /* Unknown or inactive plot ID */
    }

    /* Validate sensor inputs before applying */
    if (moisture >= MIN_SOIL_MOISTURE && moisture <= MAX_SOIL_MOISTURE) {
        plotPool[idx].soilMoisture = moisture;
    }
    if (rainForecastMM >= MIN_RAIN_FORECAST && rainForecastMM <= MAX_RAIN_FORECAST) {
        plotPool[idx].rainForecastMM = rainForecastMM;
    }
}

int deletePlotFromMap(PlotHashMap *map, int plotId) {
    if (!map || plotId <= 0) {
        return 0;
    }

    unsigned int h = hashPlotId(plotId);
    HashNode *cur = map->buckets[h];
    HashNode *prev = NULL;

    while (cur != NULL) {
        if (cur->plotId == plotId) {
            if (prev == NULL) {
                map->buckets[h] = cur->next;
            } else {
                prev->next = cur->next;
            }

            /* Also mark inactive in central pool */
            if (cur->plotIndex >= 0 && cur->plotIndex < plotPoolCount) {
                plotPool[cur->plotIndex].active = 0;
            }

            free(cur);
            map->count--;
            return 1;
        }
        prev = cur;
        cur = cur->next;
    }

    return 0;
}

void freeHashMap(PlotHashMap *map) {
    if (!map) return;

    for (int i = 0; i < HASH_TABLE_SIZE; i++) {
        HashNode *cur = map->buckets[i];
        while (cur != NULL) {
            HashNode *next = cur->next;
            free(cur);
            cur = next;
        }
        map->buckets[i] = NULL;
    }
    map->count = 0;
}

int getHashMapCount(const PlotHashMap *map) {
    return map ? map->count : 0;
}

int getHashMapLongestChain(const PlotHashMap *map) {
    if (!map) return 0;
    int maxChain = 0;

    for (int i = 0; i < HASH_TABLE_SIZE; i++) {
        int chainLen = 0;
        HashNode *cur = map->buckets[i];
        while (cur != NULL) {
            chainLen++;
            cur = cur->next;
        }
        if (chainLen > maxChain) {
            maxChain = chainLen;
        }
    }

    return maxChain;
}

double getHashMapLoadFactor(const PlotHashMap *map) {
    if (!map) return 0.0;
    return (double)map->count / (double)HASH_TABLE_SIZE;
}
