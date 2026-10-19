#ifndef AGRIFLOW_PLOTPOOL_H
#define AGRIFLOW_PLOTPOOL_H

#include "types.h"
#include <stddef.h>

/* Shared global plot pool - single source of truth */
extern Plot plotPool[MAX_PLOTS];
extern int  plotPoolCount;

/**
 * Initializes or resets the central plot pool.
 */
void initPlotPool(void);

/**
 * Validates whether a plot's fields fall within valid physical and operational limits.
 * Returns 1 if valid, 0 otherwise, writing a reason to errMsg if provided.
 */
int validatePlotData(const Plot *p, char *errMsg, size_t errSize);

/**
 * Validates whether a rectangular query zone has valid coordinates.
 * Returns 1 if valid, 0 otherwise, writing a reason to errMsg if provided.
 */
int validateRectBounds(const Rect *r, char *errMsg, size_t errSize);

/**
 * Adds a valid plot to the pool.
 * Returns the pool index [0, MAX_PLOTS - 1] on success, or -1 on error.
 */
int addPlotToPool(Plot plot);

/**
 * Retrieves a pointer to a plot by index in the pool.
 * Returns NULL if index is out of bounds.
 */
Plot *getPlot(int index);

/**
 * Returns the total number of plots currently in the pool (including inactive).
 */
int getPlotPoolCount(void);

/**
 * Returns the number of active plots currently in the pool.
 */
int getActivePlotCount(void);

/**
 * Marks a plot at given index as inactive (soft deletion).
 */
void markPlotInactive(int index);

/**
 * Generates N synthetic plots for sugarcane fields with deterministic pseudo-random values.
 * Returns the number of plots successfully added.
 */
int generateRandomPlots(int count, unsigned int seed);

#endif /* AGRIFLOW_PLOTPOOL_H */
