#ifndef AGRIFLOW_SCHEDULER_H
#define AGRIFLOW_SCHEDULER_H

#include "types.h"
#include "quadtree.h"

/**
 * Schedule execution summary statistics.
 */
typedef struct {
    int    totalMatched;        /* Total active plots matched inside query zone */
    int    plotsServed;         /* Number of plots successfully scheduled with water */
    int    plotsUnserved;       /* Eligible plots within zone not served due to exhausted budget */
    double initialBudget;       /* Water budget provided at start (liters/units) */
    double waterAllocated;      /* Total water distributed */
    double remainingBudget;     /* Water remaining unused */
} ScheduleSummary;

/**
 * Computes the urgency score for a plot according to the academic design formula:
 *   urgencyScore = soilMoisture + (rainForecastMM * 0.5) - (daysSinceIrrigation * 2.0)
 * Lower score indicates higher urgency for irrigation.
 */
double computeUrgency(Plot p);

/**
 * Generates and prints the daily irrigation schedule for a geographic zone.
 * Conforms to the academic design document signature:
 *   generateDailySchedule(root, zone, waterBudget)
 */
void generateDailySchedule(const QuadNode *root, Rect zone, double waterBudget);

/**
 * Detailed scheduling engine that optionally prints output and returns summary metrics.
 */
ScheduleSummary executeIrrigationSchedule(const QuadNode *root, Rect zone, double waterBudget, int printOutput);

#endif /* AGRIFLOW_SCHEDULER_H */
