#include "agriflow_c_api.h"
#include "minheap.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

/* Engine: Internal Global State */
static QuadNode   *s_root = NULL;
static PlotHashMap s_map;
static int         s_initialized = 0;

/* Lifecycle: Initialize Engine */
void api_init(void) {
    if (s_initialized) return;
    initPlotPool();
    initHashMap(&s_map);
    s_root = createQuadNode((Rect){FIELD_MIN_COORD, FIELD_MIN_COORD, FIELD_MAX_COORD, FIELD_MAX_COORD}, 0);
    s_initialized = 1;
}

/* Lifecycle: Free All Resources */
void api_cleanup(void) {
    if (!s_initialized) return;
    if (s_root) {
        freeQuadTree(s_root);
        s_root = NULL;
    }
    freeHashMap(&s_map);
    s_initialized = 0;
}

/* Lifecycle: Reset Engine */
void api_reset(void) {
    api_cleanup();
    api_init();
}

/* Lifecycle: Load Synthetic Sample Plots */
int api_load_samples(int count, unsigned int seed) {
    api_init();
    if (count <= 0) return 0;
    if (getPlotPoolCount() + count > MAX_PLOTS) {
        count = MAX_PLOTS - getPlotPoolCount();
    }
    if (count <= 0) return 0;

    int startIdx = plotPoolCount;
    int added = generateRandomPlots(count, seed);
    for (int i = startIdx; i < startIdx + added; i++) {
        insertPlotId(&s_map, plotPool[i].plotId, i);
        insertPlot(s_root, i);
    }
    return added;
}

/* Plot Management: Add Single Plot */
int api_add_plot(int plotId, double x, double y, double moisture, double rain, int daysOverdue, char *errBuf, int errBufSize) {
    api_init();
    if (plotId <= 0) {
        if (errBuf && errBufSize > 0) snprintf(errBuf, errBufSize, "Plot ID must be a positive integer.");
        return 0;
    }

    if (lookupPlotIndex(&s_map, plotId) != -1) {
        if (errBuf && errBufSize > 0) snprintf(errBuf, errBufSize, "Plot ID %d already exists. Duplicate IDs are rejected.", plotId);
        return 0;
    }

    Plot p;
    p.plotId = plotId;
    p.x = x;
    p.y = y;
    p.soilMoisture = moisture;
    p.rainForecastMM = rain;
    p.daysSinceIrrigation = daysOverdue;
    p.active = 1;

    char valErr[128];
    if (!validatePlotData(&p, valErr, sizeof(valErr))) {
        if (errBuf && errBufSize > 0) snprintf(errBuf, errBufSize, "%s", valErr);
        return 0;
    }

    int idx = addPlotToPool(p);
    if (idx < 0) {
        if (errBuf && errBufSize > 0) snprintf(errBuf, errBufSize, "Plot pool capacity reached (%d plots max).", MAX_PLOTS);
        return 0;
    }

    insertPlotId(&s_map, plotId, idx);
    insertPlot(s_root, idx);
    return 1;
}

/* Plot Management: Lookup Plot by ID */
int api_get_plot_by_id(int plotId, Plot *outPlot, double *outScore) {
    api_init();
    if (!outPlot) return 0;
    int idx = lookupPlotIndex(&s_map, plotId);
    if (idx < 0 || idx >= plotPoolCount || !plotPool[idx].active) {
        return 0;
    }
    *outPlot = plotPool[idx];
    if (outScore) {
        *outScore = computeUrgency(plotPool[idx]);
    }
    return 1;
}

/* Plot Management: List All Active Plots */
int api_get_all_plots(Plot *outPlots, double *outScores, int maxPlots, int *outCount) {
    api_init();
    if (!outPlots || !outCount || maxPlots <= 0) return 0;
    int n = 0;
    for (int i = 0; i < plotPoolCount && n < maxPlots; i++) {
        if (plotPool[i].active) {
            outPlots[n] = plotPool[i];
            if (outScores) {
                outScores[n] = computeUrgency(plotPool[i]);
            }
            n++;
        }
    }
    *outCount = n;
    return 1;
}

/* Plot Management: Delete Plot */
int api_delete_plot(int plotId) {
    api_init();
    int idx = lookupPlotIndex(&s_map, plotId);
    if (idx < 0 || idx >= plotPoolCount || !plotPool[idx].active) {
        return 0;
    }
    markPlotInactive(idx);
    deletePlotFromMap(&s_map, plotId);
    return 1;
}

/* Spatial Index: Rectangular Range Query */
int api_range_query(double xMin, double yMin, double xMax, double yMax, Plot *outPlots, double *outScores, int maxPlots, int *outCount, char *errBuf, int errBufSize) {
    api_init();
    if (!outPlots || !outCount) return 0;
    Rect zone = {xMin, yMin, xMax, yMax};
    char valErr[128];
    if (!validateRectBounds(&zone, valErr, sizeof(valErr))) {
        if (errBuf && errBufSize > 0) snprintf(errBuf, errBufSize, "%s", valErr);
        *outCount = 0;
        return 0;
    }

    int *matched = (int *)malloc(sizeof(int) * MAX_PLOTS);
    if (!matched) {
        if (errBuf && errBufSize > 0) snprintf(errBuf, errBufSize, "Memory allocation failure for range query buffer.");
        *outCount = 0;
        return 0;
    }

    int matchedCount = 0;
    rangeQuery(s_root, zone, matched, &matchedCount);

    int copyCount = (matchedCount < maxPlots) ? matchedCount : maxPlots;
    for (int i = 0; i < copyCount; i++) {
        int idx = matched[i];
        outPlots[i] = plotPool[idx];
        if (outScores) {
            outScores[i] = computeUrgency(plotPool[idx]);
        }
    }
    *outCount = copyCount;
    free(matched);
    return 1;
}

/* Key-Value Index: Apply Live Sensor Reading */
int api_update_sensor(int plotId, double moisture, double rain, double *outOldScore, double *outNewScore, char *errBuf, int errBufSize) {
    api_init();
    if (moisture < MIN_SOIL_MOISTURE || moisture > MAX_SOIL_MOISTURE) {
        if (errBuf && errBufSize > 0) snprintf(errBuf, errBufSize, "Moisture %.1f%% out of range [%.0f, %.0f].", moisture, MIN_SOIL_MOISTURE, MAX_SOIL_MOISTURE);
        return 0;
    }
    if (rain < MIN_RAIN_FORECAST || rain > MAX_RAIN_FORECAST) {
        if (errBuf && errBufSize > 0) snprintf(errBuf, errBufSize, "Rain forecast %.1f mm out of range [%.0f, %.0f].", rain, MIN_RAIN_FORECAST, MAX_RAIN_FORECAST);
        return 0;
    }

    int idx = lookupPlotIndex(&s_map, plotId);
    if (idx < 0 || idx >= plotPoolCount || !plotPool[idx].active) {
        if (errBuf && errBufSize > 0) snprintf(errBuf, errBufSize, "Plot ID %d not found in Hash Map.", plotId);
        return 0;
    }

    if (outOldScore) {
        *outOldScore = computeUrgency(plotPool[idx]);
    }

    applySensorReading(&s_map, plotId, moisture, rain);

    if (outNewScore) {
        *outNewScore = computeUrgency(plotPool[idx]);
    }
    return 1;
}

/* Priority Queue: Min-Heap Priority Scheduling */
int api_schedule_irrigation(double xMin, double yMin, double xMax, double yMax, double waterBudget, ApiScheduleItem *outItems, int maxItems, int *outItemCount, ScheduleSummary *outSummary, char *errBuf, int errBufSize) {
    api_init();
    Rect zone = {xMin, yMin, xMax, yMax};
    char valErr[128];
    if (!validateRectBounds(&zone, valErr, sizeof(valErr))) {
        if (errBuf && errBufSize > 0) snprintf(errBuf, errBufSize, "%s", valErr);
        if (outItemCount) *outItemCount = 0;
        return 0;
    }

    if (isnan(waterBudget) || isinf(waterBudget) || waterBudget < 0.0) {
        if (errBuf && errBufSize > 0) snprintf(errBuf, errBufSize, "Invalid water budget: must be non-negative.");
        if (outItemCount) *outItemCount = 0;
        return 0;
    }

    ScheduleSummary summary = {0, 0, 0, waterBudget, 0.0, waterBudget};

    int *matched = (int *)malloc(sizeof(int) * MAX_PLOTS);
    if (!matched) {
        if (errBuf && errBufSize > 0) snprintf(errBuf, errBufSize, "Memory allocation failure.");
        if (outItemCount) *outItemCount = 0;
        return 0;
    }

    int matchedCount = 0;
    rangeQuery(s_root, zone, matched, &matchedCount);
    summary.totalMatched = matchedCount;

    if (matchedCount == 0) {
        free(matched);
        if (outSummary) *outSummary = summary;
        if (outItemCount) *outItemCount = 0;
        return 1;
    }

    int heapCap = (matchedCount < 64) ? 64 : matchedCount;
    MinHeap *heap = createMinHeap(heapCap);
    if (!heap) {
        free(matched);
        if (errBuf && errBufSize > 0) snprintf(errBuf, errBufSize, "Failed to allocate Min-Heap.");
        if (outItemCount) *outItemCount = 0;
        return 0;
    }

    for (int i = 0; i < matchedCount; i++) {
        int idx = matched[i];
        push(heap, idx, computeUrgency(plotPool[idx]));
    }

    int itemsEmitted = 0;
    while (!isHeapEmpty(heap)) {
        int idx = extractMin(heap);
        if (idx < 0 || idx >= plotPoolCount) continue;

        Plot *p = &plotPool[idx];
        double score = computeUrgency(*p);
        int isServed = 0;
        double allocated = 0.0;

        if (summary.remainingBudget >= WATER_PER_PLOT) {
            summary.remainingBudget -= WATER_PER_PLOT;
            summary.waterAllocated += WATER_PER_PLOT;
            summary.plotsServed++;
            isServed = 1;
            allocated = WATER_PER_PLOT;
        } else {
            summary.plotsUnserved++;
            isServed = 0;
            allocated = 0.0;
        }

        if (outItems && itemsEmitted < maxItems) {
            outItems[itemsEmitted].plotId = p->plotId;
            outItems[itemsEmitted].x = p->x;
            outItems[itemsEmitted].y = p->y;
            outItems[itemsEmitted].soilMoisture = p->soilMoisture;
            outItems[itemsEmitted].rainForecastMM = p->rainForecastMM;
            outItems[itemsEmitted].daysSinceIrrigation = p->daysSinceIrrigation;
            outItems[itemsEmitted].urgencyScore = score;
            outItems[itemsEmitted].waterAllocated = allocated;
            outItems[itemsEmitted].served = isServed;
            itemsEmitted++;
        }
    }

    freeMinHeap(heap);
    free(matched);

    if (outSummary) *outSummary = summary;
    if (outItemCount) *outItemCount = itemsEmitted;
    return 1;
}

/* Telemetry: System and Data Structure Statistics */
void api_get_system_stats(ApiSystemStats *stats) {
    if (!stats) return;
    api_init();

    stats->totalPlots = getPlotPoolCount();
    stats->activePlots = getActivePlotCount();
    stats->inactivePlots = stats->totalPlots - stats->activePlots;

    double moistureSum = 0.0;
    int attention = 0;
    int activeCount = 0;

    for (int i = 0; i < plotPoolCount; i++) {
        if (plotPool[i].active) {
            moistureSum += plotPool[i].soilMoisture;
            double score = computeUrgency(plotPool[i]);
            if (score < 25.0 || plotPool[i].soilMoisture < 30.0 || plotPool[i].daysSinceIrrigation >= 4) {
                attention++;
            }
            activeCount++;
        }
    }

    stats->avgMoisture = (activeCount > 0) ? (moistureSum / activeCount) : 0.0;
    stats->needsAttentionCount = attention;

    QuadTreeStats qtStats;
    getQuadTreeStats(s_root, &qtStats);
    stats->qtNodeCount = qtStats.nodeCount;
    stats->qtLeafCount = qtStats.leafCount;
    stats->qtMaxDepth = qtStats.maxDepth;
    stats->qtPlotsIndexed = qtStats.totalPlotsIndexed;

    stats->hashCount = getHashMapCount(&s_map);
    stats->hashLongestChain = getHashMapLongestChain(&s_map);
    stats->hashLoadFactor = getHashMapLoadFactor(&s_map);
}

/* Walkthrough: Setup Isolated 6-Plot Demonstration */
void api_setup_walkthrough(void) {
    api_reset();

    Plot demoPlots[6] = {
        {1001, 15.0, 20.0, 18.0, 0.0, 5, 1},  /* P1: in-zone */
        {1042, 25.0, 30.0, 42.0, 0.0, 1, 1},  /* P2: in-zone */
        {1003, 35.0, 10.0, 25.0, 0.0, 3, 1},  /* P3: in-zone */
        {1004, 75.0, 80.0, 30.0, 5.0, 2, 1},  /* P4: out-of-zone */
        {1005, 85.0, 65.0, 45.0, 0.0, 4, 1},  /* P5: out-of-zone */
        {1006, 60.0, 90.0, 50.0, 10.0, 1, 1}  /* P6: out-of-zone */
    };

    for (int i = 0; i < 6; i++) {
        int idx = addPlotToPool(demoPlots[i]);
        insertPlotId(&s_map, demoPlots[i].plotId, idx);
        insertPlot(s_root, idx);
    }
}
