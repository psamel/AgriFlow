#include "scheduler.h"
#include "minheap.h"
#include "plotpool.h"
#include <stdio.h>
#include <stdlib.h>
#include <math.h>

double computeUrgency(Plot p) {
    /* Academic formula from Design Document:
     * urgencyScore = soilMoisture + (rainForecastMM * 0.5) - (daysSinceIrrigation * 2.0)
     * Lower score => higher irrigation priority (Min-Heap root)
     */
    double score = p.soilMoisture
                 + (p.rainForecastMM * 0.5)
                 - (p.daysSinceIrrigation * 2.0);
    return score;
}

ScheduleSummary executeIrrigationSchedule(const QuadNode *root, Rect zone, double waterBudget, int printOutput) {
    ScheduleSummary summary = {0, 0, 0, 0.0, 0.0, 0.0};

    char errMsg[128];
    if (!validateRectBounds(&zone, errMsg, sizeof(errMsg))) {
        if (printOutput) {
            printf("[ERROR] Cannot schedule irrigation: %s\n", errMsg);
        }
        return summary;
    }

    if (isnan(waterBudget) || isinf(waterBudget) || waterBudget < 0.0) {
        if (printOutput) {
            printf("[ERROR] Invalid water budget: %.2f units (must be a non-negative finite number).\n", waterBudget);
        }
        return summary;
    }

    summary.initialBudget = waterBudget;
    summary.remainingBudget = waterBudget;

    /* Allocate dynamic query result buffer sized for MAX_PLOTS to prevent stack overflow */
    int *matched = (int *)malloc(sizeof(int) * MAX_PLOTS);
    if (!matched) {
        if (printOutput) {
            printf("[ERROR] Memory allocation failure for spatial range query buffer.\n");
        }
        return summary;
    }

    int matchedCount = 0;
    if (root) {
        rangeQuery(root, zone, matched, &matchedCount);
    }
    summary.totalMatched = matchedCount;

    if (matchedCount == 0) {
        if (printOutput) {
            printf("\n--- DAILY IRRIGATION SCHEDULE ---\n");
            printf("Zone: [%.1f, %.1f] to [%.1f, %.1f]\n", zone.xMin, zone.yMin, zone.xMax, zone.yMax);
            printf("No active farm plots found in the specified zone.\n");
            printf("Remaining water budget: %.1f units.\n", summary.remainingBudget);
        }
        free(matched);
        return summary;
    }

    /* Create a fresh Min-Heap sized to matched plots */
    int heapCap = (matchedCount < 64) ? 64 : matchedCount;
    MinHeap *heap = createMinHeap(heapCap);
    if (!heap) {
        if (printOutput) {
            printf("[ERROR] Memory allocation failure for Min-Heap.\n");
        }
        free(matched);
        return summary;
    }

    /* Score and push all matched plots into the min-heap */
    for (int i = 0; i < matchedCount; i++) {
        int idx = matched[i];
        double score = computeUrgency(plotPool[idx]);
        push(heap, idx, score);
    }

    if (printOutput) {
        printf("\n========================================================================================\n");
        printf("                               DAILY IRRIGATION SCHEDULE                                \n");
        printf("========================================================================================\n");
        printf("Target Zone: [%.1f, %.1f] to [%.1f, %.1f] | Matched Plots: %d | Water Budget: %.1f units\n",
               zone.xMin, zone.yMin, zone.xMax, zone.yMax, matchedCount, waterBudget);
        printf("----------------------------------------------------------------------------------------\n");
        printf("%-6s | %-8s | %-16s | %-10s | %-10s | %-9s | %-12s\n",
               "Rank", "Plot ID", "Coordinates", "Moisture", "Rain (mm)", "Overdue", "Urgency Score");
        printf("----------------------------------------------------------------------------------------\n");
    }

    int rank = 1;
    int unservedList[128];
    int unservedPrinted = 0;

    while (!isHeapEmpty(heap)) {
        int idx = extractMin(heap);
        if (idx < 0 || idx >= plotPoolCount) continue;

        Plot *p = &plotPool[idx];
        double score = computeUrgency(*p);

        if (summary.remainingBudget >= WATER_PER_PLOT) {
            summary.remainingBudget -= WATER_PER_PLOT;
            summary.waterAllocated += WATER_PER_PLOT;
            summary.plotsServed++;

            if (printOutput) {
                printf("#%-5d | %-8d | (%5.1f, %5.1f)    | %6.1f%%    | %6.1f mm  | %4d days | %10.2f\n",
                       rank++, p->plotId, p->x, p->y, p->soilMoisture, p->rainForecastMM,
                       p->daysSinceIrrigation, score);
            }
        } else {
            summary.plotsUnserved++;
            if (unservedPrinted < 128) {
                unservedList[unservedPrinted++] = idx;
            }
        }
    }

    if (printOutput) {
        printf("----------------------------------------------------------------------------------------\n");
        printf("Summary:\n");
        printf("  - Plots served with water: %d (Allocated: %.1f units)\n", summary.plotsServed, summary.waterAllocated);
        printf("  - Remaining water budget : %.1f units\n", summary.remainingBudget);

        if (summary.plotsUnserved > 0) {
            printf("  - Eligible plots NOT served due to water budget exhaustion: %d\n", summary.plotsUnserved);
            printf("    Unserved plot IDs: ");
            for (int k = 0; k < unservedPrinted; k++) {
                printf("%d%s", plotPool[unservedList[k]].plotId, (k + 1 < unservedPrinted) ? ", " : "");
            }
            if (summary.plotsUnserved > unservedPrinted) {
                printf(" ... (+%d more)", summary.plotsUnserved - unservedPrinted);
            }
            printf("\n");
        } else {
            printf("  - All eligible plots in the zone were fully scheduled!\n");
        }
        printf("========================================================================================\n\n");
    }

    /* Clean up all temporary structures */
    freeMinHeap(heap);
    free(matched);

    return summary;
}

void generateDailySchedule(const QuadNode *root, Rect zone, double waterBudget) {
    executeIrrigationSchedule(root, zone, waterBudget, 1);
}
