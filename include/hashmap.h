#ifndef AGRIFLOW_HASHMAP_H
#define AGRIFLOW_HASHMAP_H

#include "types.h"

/**
 * Initializes all hash buckets to NULL and resets the mapping count.
 */
void initHashMap(PlotHashMap *map);

/**
 * Multiplicative hash function mapping an integer plot ID to a bucket index [0, HASH_TABLE_SIZE-1].
 * Formula: ((unsigned int)plotId * 2654435761u) % HASH_TABLE_SIZE
 */
unsigned int hashPlotId(int plotId);

/**
 * Inserts a new plotId -> plotIndex mapping.
 * Rejects duplicate IDs: returns 1 on success, 0 if ID already exists, -1 on allocation failure.
 */
int insertPlotId(PlotHashMap *map, int plotId, int plotIndex);

/**
 * Retains design document signature:
 * If plotId already exists, updates its mapped plotIndex; otherwise inserts a new node.
 */
void insertOrUpdate(PlotHashMap *map, int plotId, int plotIndex);

/**
 * Looks up a plot ID in O(1) average time.
 * Returns the pool index [0, MAX_PLOTS - 1] if found, or -1 if the ID is not registered.
 */
int lookupPlotIndex(const PlotHashMap *map, int plotId);

/**
 * Applies incoming live sensor readings directly to the shared plot record in O(1) time.
 * Does not traverse or alter the Quad-Tree spatial index.
 */
void applySensorReading(PlotHashMap *map, int plotId, double moisture, double rainForecastMM);

/**
 * Deletes a plot ID from the hash map, freeing its chain node.
 * Returns 1 if removed, 0 if not found.
 */
int deletePlotFromMap(PlotHashMap *map, int plotId);

/**
 * Frees all allocated hash nodes in the table and resets the map.
 */
void freeHashMap(PlotHashMap *map);

/**
 * Statistics functions for data structure analysis menu.
 */
int    getHashMapCount(const PlotHashMap *map);
int    getHashMapLongestChain(const PlotHashMap *map);
double getHashMapLoadFactor(const PlotHashMap *map);

#endif /* AGRIFLOW_HASHMAP_H */
