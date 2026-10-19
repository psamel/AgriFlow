#include "plotpool.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

Plot plotPool[MAX_PLOTS];
int  plotPoolCount = 0;

void initPlotPool(void) {
    memset(plotPool, 0, sizeof(plotPool));
    plotPoolCount = 0;
}

int validatePlotData(const Plot *p, char *errMsg, size_t errSize) {
    if (!p) {
        if (errMsg && errSize > 0) snprintf(errMsg, errSize, "Null plot pointer.");
        return 0;
    }

    if (p->plotId <= 0) {
        if (errMsg && errSize > 0) snprintf(errMsg, errSize, "Plot ID must be a positive integer (received %d).", p->plotId);
        return 0;
    }

    /* Check for NaN and Inf */
    if (isnan(p->x) || isinf(p->x) || isnan(p->y) || isinf(p->y)) {
        if (errMsg && errSize > 0) snprintf(errMsg, errSize, "Coordinates must be finite real numbers.");
        return 0;
    }

    if (p->x < FIELD_MIN_COORD || p->x > FIELD_MAX_COORD ||
        p->y < FIELD_MIN_COORD || p->y > FIELD_MAX_COORD) {
        if (errMsg && errSize > 0) {
            snprintf(errMsg, errSize, "Coordinates (%.2f, %.2f) exceed field bounds [%.1f, %.1f].",
                     p->x, p->y, FIELD_MIN_COORD, FIELD_MAX_COORD);
        }
        return 0;
    }

    if (isnan(p->soilMoisture) || isinf(p->soilMoisture) ||
        p->soilMoisture < MIN_SOIL_MOISTURE || p->soilMoisture > MAX_SOIL_MOISTURE) {
        if (errMsg && errSize > 0) {
            snprintf(errMsg, errSize, "Soil moisture %.2f%% must be between %.1f%% and %.1f%%.",
                     p->soilMoisture, MIN_SOIL_MOISTURE, MAX_SOIL_MOISTURE);
        }
        return 0;
    }

    if (isnan(p->rainForecastMM) || isinf(p->rainForecastMM) ||
        p->rainForecastMM < MIN_RAIN_FORECAST || p->rainForecastMM > MAX_RAIN_FORECAST) {
        if (errMsg && errSize > 0) {
            snprintf(errMsg, errSize, "Rainfall forecast %.2f mm must be between %.1f and %.1f mm.",
                     p->rainForecastMM, MIN_RAIN_FORECAST, MAX_RAIN_FORECAST);
        }
        return 0;
    }

    if (p->daysSinceIrrigation < MIN_DAYS_IRRIGATION || p->daysSinceIrrigation > MAX_DAYS_IRRIGATION) {
        if (errMsg && errSize > 0) {
            snprintf(errMsg, errSize, "Days since irrigation (%d) must be between %d and %d.",
                     p->daysSinceIrrigation, MIN_DAYS_IRRIGATION, MAX_DAYS_IRRIGATION);
        }
        return 0;
    }

    return 1;
}

int validateRectBounds(const Rect *r, char *errMsg, size_t errSize) {
    if (!r) {
        if (errMsg && errSize > 0) snprintf(errMsg, errSize, "Null rectangle pointer.");
        return 0;
    }

    if (isnan(r->xMin) || isinf(r->xMin) || isnan(r->yMin) || isinf(r->yMin) ||
        isnan(r->xMax) || isinf(r->xMax) || isnan(r->yMax) || isinf(r->yMax)) {
        if (errMsg && errSize > 0) snprintf(errMsg, errSize, "Zone coordinates must be finite real numbers.");
        return 0;
    }

    if (r->xMin > r->xMax || r->yMin > r->yMax) {
        if (errMsg && errSize > 0) {
            snprintf(errMsg, errSize, "Invalid range: xMin (%.2f) > xMax (%.2f) or yMin (%.2f) > yMax (%.2f).",
                     r->xMin, r->xMax, r->yMin, r->yMax);
        }
        return 0;
    }

    if (r->xMin < FIELD_MIN_COORD || r->xMax > FIELD_MAX_COORD ||
        r->yMin < FIELD_MIN_COORD || r->yMax > FIELD_MAX_COORD) {
        if (errMsg && errSize > 0) {
            snprintf(errMsg, errSize, "Zone [%.1f, %.1f] to [%.1f, %.1f] outside field limits [%.1f, %.1f].",
                     r->xMin, r->yMin, r->xMax, r->yMax, FIELD_MIN_COORD, FIELD_MAX_COORD);
        }
        return 0;
    }

    return 1;
}

int addPlotToPool(Plot plot) {
    if (plotPoolCount >= MAX_PLOTS) {
        return -1;
    }

    plot.active = 1;
    int idx = plotPoolCount;
    plotPool[idx] = plot;
    plotPoolCount++;
    return idx;
}

Plot *getPlot(int index) {
    if (index < 0 || index >= plotPoolCount) {
        return NULL;
    }
    return &plotPool[index];
}

int getPlotPoolCount(void) {
    return plotPoolCount;
}

int getActivePlotCount(void) {
    int active = 0;
    for (int i = 0; i < plotPoolCount; i++) {
        if (plotPool[i].active) {
            active++;
        }
    }
    return active;
}

void markPlotInactive(int index) {
    if (index >= 0 && index < plotPoolCount) {
        plotPool[index].active = 0;
    }
}

int generateRandomPlots(int count, unsigned int seed) {
    if (count <= 0) return 0;
    if (plotPoolCount + count > MAX_PLOTS) {
        count = MAX_PLOTS - plotPoolCount;
    }
    if (count <= 0) return 0;

    srand(seed);

    int added = 0;
    for (int i = 0; i < count; i++) {
        Plot p;
        /* Generate distinct sequential IDs starting above existing pool IDs */
        p.plotId = 1000 + plotPoolCount + 1;
        
        /* Spread coordinates smoothly over 0 to 100 */
        p.x = ((double)rand() / (double)RAND_MAX) * 100.0;
        p.y = ((double)rand() / (double)RAND_MAX) * 100.0;

        /* Realistic sugarcane agronomic ranges:
         * Soil moisture: 10% (severe wilting) to 65% (field capacity)
         * Rainfall forecast: 0mm (dry spell) to 40mm (monsoon shower)
         * Days since irrigation: 0 to 14 days
         */
        p.soilMoisture = 10.0 + ((double)rand() / (double)RAND_MAX) * 55.0;
        p.rainForecastMM = ((rand() % 100) < 65) ? 0.0 : (((double)rand() / (double)RAND_MAX) * 35.0);
        p.daysSinceIrrigation = rand() % 15;
        p.active = 1;

        if (addPlotToPool(p) >= 0) {
            added++;
        }
    }

    return added;
}
