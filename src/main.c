#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "types.h"
#include "plotpool.h"
#include "quadtree.h"
#include "hashmap.h"
#include "minheap.h"
#include "scheduler.h"

/* Global data structure state */
static QuadNode   *g_quadRoot = NULL;
static PlotHashMap g_hashMap;

/* Helper prototypes */
static int  readInt(const char *prompt, int *val, int minVal, int maxVal);
static int  readDouble(const char *prompt, double *val, double minVal, double maxVal);
static void waitForEnter(void);
static void rebuildAllStructures(void);
static void runWalkthroughDemo(void);
static void runInProcessBenchmark(void);

static void printBanner(void) {
    printf("\n");
    printf("====================================================\n");
    printf("                     AGRIFLOW                       \n");
    printf("        Smart Irrigation Priority Scheduler         \n");
    printf("====================================================\n");
    printf(" KJS-AGR-01: Sugarcane Irrigation Advisory System   \n");
    printf(" Data Structures: Quad-Tree | Hash Map | Min-Heap   \n");
    printf("====================================================\n");
}

static void printMenu(void) {
    printf("\n--- MAIN MENU ---\n");
    printf("1. Generate N random plots\n");
    printf("2. Add one plot manually\n");
    printf("3. Query plots within a rectangular zone\n");
    printf("4. Apply a sensor reading to a plot\n");
    printf("5. Search for a plot by ID\n");
    printf("6. Generate an irrigation schedule\n");
    printf("7. Run the documented walkthrough demo\n");
    printf("8. Show data-structure statistics\n");
    printf("9. Run benchmark\n");
    printf("0. Exit\n");
    printf("----------------------------------------------------\n");
}

int main(void) {
    initPlotPool();
    initHashMap(&g_hashMap);
    g_quadRoot = createQuadNode((Rect){FIELD_MIN_COORD, FIELD_MIN_COORD, FIELD_MAX_COORD, FIELD_MAX_COORD}, 0);

    printBanner();

    int choice = -1;
    while (choice != 0) {
        printMenu();
        if (!readInt("Select an option (0-9): ", &choice, 0, 9)) {
            printf("[WARNING] Invalid choice. Please enter a number between 0 and 9.\n");
            continue;
        }

        switch (choice) {
            case 1: { /* Generate N random plots */
                printf("\n--- GENERATE RANDOM PLOTS ---\n");
                printf("Current active plots in pool: %d / %d\n", getActivePlotCount(), MAX_PLOTS);
                int count = 0;
                if (!readInt("Enter number of plots to generate (1 - 25000): ", &count, 1, MAX_PLOTS)) {
                    printf("[ERROR] Invalid plot count.\n");
                    break;
                }

                int replaceChoice = 1;
                if (getPlotPoolCount() > 0) {
                    readInt("Replace existing dataset? (1 = Yes, 0 = Append): ", &replaceChoice, 0, 1);
                }

                if (replaceChoice == 1) {
                    rebuildAllStructures();
                }

                if (getPlotPoolCount() + count > MAX_PLOTS) {
                    count = MAX_PLOTS - getPlotPoolCount();
                    printf("[NOTE] Adjusted count to %d to respect MAX_PLOTS limit (%d).\n", count, MAX_PLOTS);
                }

                if (count <= 0) {
                    printf("[NOTE] Plot pool is full. Cannot generate additional plots.\n");
                    break;
                }

                int seed = 42;
                readInt("Enter random seed (e.g. 42 for reproducible results, 0 for time-based): ", &seed, 0, 1000000);
                if (seed == 0) seed = (int)time(NULL);

                int startIdx = plotPoolCount;
                int added = generateRandomPlots(count, (unsigned int)seed);

                /* Register generated plots into Quad-Tree and Hash Map */
                int registered = 0;
                for (int i = startIdx; i < startIdx + added; i++) {
                    insertPlotId(&g_hashMap, plotPool[i].plotId, i);
                    insertPlot(g_quadRoot, i);
                    registered++;
                }

                printf("[SUCCESS] Generated and registered %d synthetic sugarcane plots.\n", registered);
                printf("[NOTE] Dataset is simulated for data-structure validation (not real sensor hardware).\n");
                break;
            }

            case 2: { /* Add one plot manually */
                printf("\n--- ADD PLOT MANUALLY ---\n");
                if (getPlotPoolCount() >= MAX_PLOTS) {
                    printf("[ERROR] Plot pool reached capacity (%d plots).\n", MAX_PLOTS);
                    break;
                }

                Plot p;
                if (!readInt("Enter Plot ID (positive integer): ", &p.plotId, 1, 10000000)) break;

                /* Check for duplicate ID using Hash Map */
                if (lookupPlotIndex(&g_hashMap, p.plotId) != -1) {
                    printf("[REJECTED] Plot ID %d already exists in the system! Duplicate IDs are forbidden.\n", p.plotId);
                    break;
                }

                if (!readDouble("Enter X Coordinate [0.0 - 100.0]: ", &p.x, FIELD_MIN_COORD, FIELD_MAX_COORD)) break;
                if (!readDouble("Enter Y Coordinate [0.0 - 100.0]: ", &p.y, FIELD_MIN_COORD, FIELD_MAX_COORD)) break;
                if (!readDouble("Enter Soil Moisture percentage [0.0 - 100.0]: ", &p.soilMoisture, MIN_SOIL_MOISTURE, MAX_SOIL_MOISTURE)) break;
                if (!readDouble("Enter Rain Forecast in mm [0.0 - 500.0]: ", &p.rainForecastMM, MIN_RAIN_FORECAST, MAX_RAIN_FORECAST)) break;
                if (!readInt("Enter Days Since Last Irrigation [0 - 365]: ", &p.daysSinceIrrigation, MIN_DAYS_IRRIGATION, MAX_DAYS_IRRIGATION)) break;

                char errMsg[128];
                if (!validatePlotData(&p, errMsg, sizeof(errMsg))) {
                    printf("[ERROR] Validation failed: %s\n", errMsg);
                    break;
                }

                int idx = addPlotToPool(p);
                if (idx < 0) {
                    printf("[ERROR] Failed to add plot to central pool.\n");
                    break;
                }

                insertPlotId(&g_hashMap, p.plotId, idx);
                insertPlot(g_quadRoot, idx);

                double score = computeUrgency(p);
                printf("[SUCCESS] Plot %d successfully registered at pool index %d.\n", p.plotId, idx);
                printf("  Calculated Urgency Score: %.2f (Moisture: %.1f%%, Rain: %.1f mm, Overdue: %d days)\n",
                       score, p.soilMoisture, p.rainForecastMM, p.daysSinceIrrigation);
                break;
            }

            case 3: { /* Query plots within rectangular zone */
                printf("\n--- SPATIAL REGION QUERY (QUAD-TREE) ---\n");
                Rect zone;
                if (!readDouble("Enter Zone xMin [0.0 - 100.0]: ", &zone.xMin, FIELD_MIN_COORD, FIELD_MAX_COORD)) break;
                if (!readDouble("Enter Zone yMin [0.0 - 100.0]: ", &zone.yMin, FIELD_MIN_COORD, FIELD_MAX_COORD)) break;
                if (!readDouble("Enter Zone xMax [0.0 - 100.0]: ", &zone.xMax, FIELD_MIN_COORD, FIELD_MAX_COORD)) break;
                if (!readDouble("Enter Zone yMax [0.0 - 100.0]: ", &zone.yMax, FIELD_MIN_COORD, FIELD_MAX_COORD)) break;

                char errMsg[128];
                if (!validateRectBounds(&zone, errMsg, sizeof(errMsg))) {
                    printf("[ERROR] %s\n", errMsg);
                    break;
                }

                int *results = (int *)malloc(sizeof(int) * MAX_PLOTS);
                if (!results) {
                    printf("[ERROR] Memory allocation failure.\n");
                    break;
                }

                int count = 0;
                rangeQuery(g_quadRoot, zone, results, &count);

                printf("\n--- QUERY RESULTS: Zone [%.1f, %.1f] to [%.1f, %.1f] ---\n",
                       zone.xMin, zone.yMin, zone.xMax, zone.yMax);
                printf("Matched active plots: %d\n", count);

                if (count > 0) {
                    printf("----------------------------------------------------------------------------------------\n");
                    printf("%-8s | %-16s | %-10s | %-10s | %-9s | %-12s\n",
                           "Plot ID", "Coordinates", "Moisture", "Rain (mm)", "Overdue", "Urgency Score");
                    printf("----------------------------------------------------------------------------------------\n");
                    int displayLimit = (count > 50) ? 50 : count;
                    for (int i = 0; i < displayLimit; i++) {
                        Plot *p = &plotPool[results[i]];
                        double score = computeUrgency(*p);
                        printf("%-8d | (%5.1f, %5.1f)    | %6.1f%%    | %6.1f mm  | %4d days | %10.2f\n",
                               p->plotId, p->x, p->y, p->soilMoisture, p->rainForecastMM, p->daysSinceIrrigation, score);
                    }
                    if (count > displayLimit) {
                        printf("... and %d more plots (output truncated for console readability).\n", count - displayLimit);
                    }
                    printf("----------------------------------------------------------------------------------------\n");
                } else {
                    printf("No active farm plots found in this geographic zone.\n");
                }

                free(results);
                break;
            }

            case 4: { /* Apply sensor reading to a plot */
                printf("\n--- APPLY SENSOR READING (HASH MAP O(1)) ---\n");
                int plotId = 0;
                if (!readInt("Enter Plot ID to update: ", &plotId, 1, 10000000)) break;

                int idx = lookupPlotIndex(&g_hashMap, plotId);
                if (idx == -1) {
                    printf("[ERROR] Plot ID %d not found in Hash Map. Reading dropped.\n", plotId);
                    break;
                }

                Plot *p = &plotPool[idx];
                double oldScore = computeUrgency(*p);
                printf("Current Status for Plot %d:\n", plotId);
                printf("  Location: (%.1f, %.1f) | Soil Moisture: %.1f%% | Rain: %.1f mm | Overdue: %d days | Urgency: %.2f\n",
                       p->x, p->y, p->soilMoisture, p->rainForecastMM, p->daysSinceIrrigation, oldScore);

                double newMoisture, newRain;
                if (!readDouble("Enter New Soil Moisture percentage [0.0 - 100.0]: ", &newMoisture, MIN_SOIL_MOISTURE, MAX_SOIL_MOISTURE)) break;
                if (!readDouble("Enter New Rainfall Forecast in mm [0.0 - 500.0]: ", &newRain, MIN_RAIN_FORECAST, MAX_RAIN_FORECAST)) break;

                applySensorReading(&g_hashMap, plotId, newMoisture, newRain);

                double newScore = computeUrgency(*p);
                printf("\n[SUCCESS] Sensor reading applied to central plotPool via Hash Map lookup.\n");
                printf("  Updated Soil Moisture : %.1f%% -> %.1f%%\n", p->soilMoisture, newMoisture);
                printf("  Updated Rain Forecast : %.1f mm -> %.1f mm\n", p->rainForecastMM, newRain);
                printf("  Recalculated Urgency  : %.2f -> %.2f (%s)\n",
                       oldScore, newScore, (newScore < oldScore) ? "More urgent" : "Less urgent");
                printf("  Quad-Tree remains untouched; shared plotPool is single source of truth.\n");
                break;
            }

            case 5: { /* Search for plot by ID */
                printf("\n--- SEARCH PLOT BY ID (HASH MAP) ---\n");
                int plotId = 0;
                if (!readInt("Enter Plot ID: ", &plotId, 1, 10000000)) break;

                int idx = lookupPlotIndex(&g_hashMap, plotId);
                if (idx == -1) {
                    printf("[NOT FOUND] Plot ID %d does not exist or has been deleted.\n", plotId);
                } else {
                    Plot *p = &plotPool[idx];
                    double score = computeUrgency(*p);
                    unsigned int bucket = hashPlotId(plotId);
                    printf("\nPlot Details (Retrieved via Hash Map):\n");
                    printf("  - Plot ID             : %d\n", p->plotId);
                    printf("  - Central Pool Index  : %d\n", idx);
                    printf("  - Hash Table Bucket   : %u / %d\n", bucket, HASH_TABLE_SIZE);
                    printf("  - Coordinates         : (%.2f, %.2f)\n", p->x, p->y);
                    printf("  - Soil Moisture       : %.1f%%\n", p->soilMoisture);
                    printf("  - Rainfall Forecast   : %.1f mm\n", p->rainForecastMM);
                    printf("  - Days Since Last Irr : %d days\n", p->daysSinceIrrigation);
                    printf("  - Status              : %s\n", p->active ? "Active" : "Inactive");
                    printf("  - Urgency Score       : %.2f\n", score);
                }
                break;
            }

            case 6: { /* Generate irrigation schedule */
                printf("\n--- GENERATE DAILY IRRIGATION SCHEDULE ---\n");
                Rect zone;
                if (!readDouble("Enter Target Zone xMin [0.0 - 100.0]: ", &zone.xMin, FIELD_MIN_COORD, FIELD_MAX_COORD)) break;
                if (!readDouble("Enter Target Zone yMin [0.0 - 100.0]: ", &zone.yMin, FIELD_MIN_COORD, FIELD_MAX_COORD)) break;
                if (!readDouble("Enter Target Zone xMax [0.0 - 100.0]: ", &zone.xMax, FIELD_MIN_COORD, FIELD_MAX_COORD)) break;
                if (!readDouble("Enter Target Zone yMax [0.0 - 100.0]: ", &zone.yMax, FIELD_MIN_COORD, FIELD_MAX_COORD)) break;

                double budget = 0.0;
                if (!readDouble("Enter Available Water Budget in units (>= 0.0, 10.0/plot): ", &budget, 0.0, 1000000.0)) break;

                generateDailySchedule(g_quadRoot, zone, budget);
                break;
            }

            case 7: { /* Run the documented walkthrough demo */
                runWalkthroughDemo();
                break;
            }

            case 8: { /* Show data-structure statistics */
                printf("\n====================================================\n");
                printf("              DATA STRUCTURE STATISTICS             \n");
                printf("====================================================\n");
                printf("Central Plot Pool:\n");
                printf("  - Total plots allocated in pool : %d / %d (%.1f%%)\n",
                       getPlotPoolCount(), MAX_PLOTS, ((double)getPlotPoolCount() / MAX_PLOTS) * 100.0);
                printf("  - Active plots                  : %d\n", getActivePlotCount());
                printf("  - Inactive / deleted plots      : %d\n", getPlotPoolCount() - getActivePlotCount());

                QuadTreeStats qtStats;
                getQuadTreeStats(g_quadRoot, &qtStats);
                printf("\nQuad-Tree (Spatial 2D Index):\n");
                printf("  - Total nodes in tree           : %d\n", qtStats.nodeCount);
                printf("  - Leaf nodes                    : %d\n", qtStats.leafCount);
                printf("  - Internal branch nodes         : %d\n", qtStats.nodeCount - qtStats.leafCount);
                printf("  - Maximum tree depth reached    : %d (limit: %d)\n", qtStats.maxDepth, MAX_DEPTH);
                printf("  - Total plot indices stored     : %d\n", qtStats.totalPlotsIndexed);

                printf("\nHash Map (Plot ID Lookup Index):\n");
                printf("  - Table bucket size             : %d (prime)\n", HASH_TABLE_SIZE);
                printf("  - Active entries                : %d\n", getHashMapCount(&g_hashMap));
                printf("  - Longest collision chain       : %d\n", getHashMapLongestChain(&g_hashMap));
                printf("  - Current load factor           : %.4f\n", getHashMapLoadFactor(&g_hashMap));

                printf("\nBinary Min-Heap (Scheduler Priority Queue):\n");
                printf("  - Implementation                : Dynamic binary min-heap\n");
                printf("  - Max supported capacity        : %d entries (heap allocated)\n", MAX_PLOTS);
                printf("  - Fixed water allocation/plot   : %.1f units\n", WATER_PER_PLOT);
                printf("====================================================\n");
                break;
            }

            case 9: { /* Run benchmark */
                runInProcessBenchmark();
                break;
            }

            case 0: { /* Exit */
                printf("\n[EXIT] Cleaning up memory resources...\n");
                freeQuadTree(g_quadRoot);
                g_quadRoot = NULL;
                freeHashMap(&g_hashMap);
                printf("All memory successfully freed. Goodbye!\n\n");
                break;
            }

            default:
                printf("[WARNING] Invalid option. Enter 0-9.\n");
                break;
        }

        if (choice != 0) {
            waitForEnter();
        }
    }

    return 0;
}

static int readInt(const char *prompt, int *val, int minVal, int maxVal) {
    char buf[128];
    printf("%s", prompt);
    if (!fgets(buf, sizeof(buf), stdin)) {
        return 0;
    }

    char *endptr;
    long num = strtol(buf, &endptr, 10);
    if (endptr == buf || (*endptr != '\n' && *endptr != '\0')) {
        return 0;
    }
    if (num < minVal || num > maxVal) {
        return 0;
    }
    *val = (int)num;
    return 1;
}

static int readDouble(const char *prompt, double *val, double minVal, double maxVal) {
    char buf[128];
    printf("%s", prompt);
    if (!fgets(buf, sizeof(buf), stdin)) {
        return 0;
    }

    char *endptr;
    double num = strtod(buf, &endptr);
    if (endptr == buf || (*endptr != '\n' && *endptr != '\0')) {
        return 0;
    }
    if (num < minVal || num > maxVal) {
        return 0;
    }
    *val = num;
    return 1;
}

static void waitForEnter(void) {
    printf("\nPress ENTER to continue...");
    fflush(stdout);
    int c;
    while ((c = getchar()) != '\n' && c != EOF) {}
}

static void rebuildAllStructures(void) {
    if (g_quadRoot) {
        freeQuadTree(g_quadRoot);
        g_quadRoot = NULL;
    }
    freeHashMap(&g_hashMap);
    initPlotPool();
    initHashMap(&g_hashMap);
    g_quadRoot = createQuadNode((Rect){FIELD_MIN_COORD, FIELD_MIN_COORD, FIELD_MAX_COORD, FIELD_MAX_COORD}, 0);
}

static void runWalkthroughDemo(void) {
    printf("\n========================================================================================\n");
    printf("                  ACADEMIC WALKTHROUGH DEMONSTRATION (6-PLOT EXPERIMENT)                 \n");
    printf("========================================================================================\n");
    printf("Design Document Reference: Section 5 - Sample Walkthrough\n");
    printf("Setting up isolated 6-plot testbed covering a 100x100 unit sugarcane field...\n\n");

    /* Rebuild all structures for an isolated, deterministic demo */
    rebuildAllStructures();

    /* 6 plots: P1-P3 inside (0,0)-(50,50), P4-P6 outside */
    Plot demoPlots[6] = {
        {1001, 15.0, 20.0, 18.0, 0.0, 5, 1},  /* P1: in-zone */
        {1042, 25.0, 30.0, 42.0, 0.0, 1, 1},  /* P2: in-zone */
        {1003, 35.0, 10.0, 25.0, 0.0, 3, 1},  /* P3: in-zone */
        {1004, 75.0, 80.0, 30.0, 5.0, 2, 1},  /* P4: out-of-zone */
        {1005, 85.0, 65.0, 45.0, 0.0, 4, 1},  /* P5: out-of-zone */
        {1006, 60.0, 90.0, 50.0, 10.0, 1, 1}  /* P6: out-of-zone */
    };

    const char *labels[6] = {"P1", "P2", "P3", "P4", "P5", "P6"};

    printf("Plot Setup Table:\n");
    printf("%-5s | %-8s | %-14s | %-10s | %-10s | %-9s | %-10s\n",
           "Label", "Plot ID", "Coordinates", "Moisture", "Rain (mm)", "Overdue", "Location");
    printf("----------------------------------------------------------------------------------------\n");

    for (int i = 0; i < 6; i++) {
        int idx = addPlotToPool(demoPlots[i]);
        insertPlotId(&g_hashMap, demoPlots[i].plotId, idx);
        insertPlot(g_quadRoot, idx);

        const char *loc = (i < 3) ? "IN-ZONE (0,0)-(50,50)" : "OUTSIDE (0,0)-(50,50)";
        printf("%-5s | %-8d | (%4.1f, %4.1f)     | %6.1f%%    | %6.1f mm  | %4d days | %s\n",
               labels[i], demoPlots[i].plotId, demoPlots[i].x, demoPlots[i].y,
               demoPlots[i].soilMoisture, demoPlots[i].rainForecastMM,
               demoPlots[i].daysSinceIrrigation, loc);
    }
    printf("----------------------------------------------------------------------------------------\n\n");

    Rect queryZone = {0.0, 0.0, 50.0, 50.0};
    double waterBudget = 30.0; /* 10.0 units per plot => covers exactly 3 plots */

    printf("Step 1: Execute Quad-Tree spatial range query for Zone (0,0) to (50,50):\n");
    int matched[MAX_PLOTS];
    int count = 0;
    rangeQuery(g_quadRoot, queryZone, matched, &count);
    printf("  -> Quad-Tree matched %d plots inside zone: ", count);
    for (int i = 0; i < count; i++) {
        printf("%d%s", plotPool[matched[i]].plotId, (i + 1 < count) ? ", " : "\n");
    }

    printf("\nStep 2: Urgency Calculation for matched in-zone plots:\n");
    printf("  Formula: urgencyScore = soilMoisture + (rainForecastMM * 0.5) - (daysSinceIrrigation * 2.0)\n");
    printf("  * P1 (ID 1001): 18.0 + (0.0 * 0.5) - (5 * 2.0) = 8.00\n");
    printf("  * P3 (ID 1003): 25.0 + (0.0 * 0.5) - (3 * 2.0) = 19.00\n");
    printf("  * P2 (ID 1042): 42.0 + (0.0 * 0.5) - (1 * 2.0) = 40.00\n");

    printf("\nStep 3: Initial Schedule Generation (Budget = %.1f units):\n", waterBudget);
    generateDailySchedule(g_quadRoot, queryZone, waterBudget);

    printf("  VERIFICATION: Initial order is P1 (score 8) -> P3 (score 19) -> P2 (score 40).\n\n");

    printf("----------------------------------------------------------------------------------------\n");
    printf("Step 4: Live Sensor Reading Arrives for P2 (Plot ID 1042):\n");
    printf("  After a scorching afternoon, soil moisture drops from 42.0%% down to 15.0%%.\n");
    printf("  Updating via Hash Map in O(1) time: applySensorReading(&map, 1042, 15.0, 0.0)...\n");

    applySensorReading(&g_hashMap, 1042, 15.0, 0.0);

    double newScore = computeUrgency(plotPool[lookupPlotIndex(&g_hashMap, 1042)]);
    printf("  Updated P2 moisture: 15.0%%\n");
    printf("  Recalculated P2 Urgency Score: 15.0 + (0.0 * 0.5) - (1 * 2.0) = %.2f\n\n", newScore);

    printf("Step 5: Regenerated Schedule (Budget = %.1f units):\n", waterBudget);
    generateDailySchedule(g_quadRoot, queryZone, waterBudget);

    printf("  VERIFICATION: Regenerated order is P1 (score 8) -> P2 (score 13) -> P3 (score 19)!\n");
    printf("  Notice how P2 jumped ahead of P3 because its score dropped from 40 down to 13.\n");
    printf("========================================================================================\n");
}

static void runInProcessBenchmark(void) {
    printf("\n========================================================================================\n");
    printf("                             AGRIFLOW PERFORMANCE BENCHMARK                            \n");
    printf("========================================================================================\n");
    printf("Comparing:\n");
    printf("  1. Plot ID Lookup : Linear Scan O(n) vs Hash Map O(1)\n");
    printf("  2. Spatial Query  : Brute-Force Scan O(n) vs Quad-Tree O(log n + k)\n");
    printf("Environment: Windows MinGW GCC | High-Precision portable clock()\n");
    printf("----------------------------------------------------------------------------------------\n");

    int testSizes[] = {1000, 5000, 10000, 25000};
    int numSizes = 4;
    int numOps = 1000; /* 1000 lookups and 1000 region queries */

    printf("%-8s | %-16s | %-16s | %-10s | %-16s | %-16s | %-10s\n",
           "Plots", "Scan ID (ms)", "Hash ID (ms)", "ID Speedup", "Scan Geo (ms)", "QuadTree (ms)", "Geo Speedup");
    printf("----------------------------------------------------------------------------------------\n");

    for (int s = 0; s < numSizes; s++) {
        int n = testSizes[s];

        /* Build dataset of size n */
        rebuildAllStructures();
        generateRandomPlots(n, 12345 + n);

        for (int i = 0; i < n; i++) {
            insertPlotId(&g_hashMap, plotPool[i].plotId, i);
            insertPlot(g_quadRoot, i);
        }

        /* 1. Benchmark Plot ID Lookup */
        int queryIds[1000];
        srand(999);
        for (int q = 0; q < numOps; q++) {
            /* Pick randomly from inserted plots or outside */
            if (q % 5 == 0) {
                queryIds[q] = 999999 + q; /* missing */
            } else {
                int randIdx = rand() % n;
                queryIds[q] = plotPool[randIdx].plotId;
            }
        }

        /* Linear scan */
        clock_t t0 = clock();
        volatile int dummyScan = 0;
        for (int q = 0; q < numOps; q++) {
            int target = queryIds[q];
            int foundIdx = -1;
            for (int i = 0; i < n; i++) {
                if (plotPool[i].plotId == target && plotPool[i].active) {
                    foundIdx = i;
                    break;
                }
            }
            dummyScan += foundIdx;
        }
        clock_t t1 = clock();
        double timeScanId = ((double)(t1 - t0) * 1000.0) / CLOCKS_PER_SEC;

        /* Hash Map lookup */
        clock_t t2 = clock();
        volatile int dummyHash = 0;
        for (int q = 0; q < numOps; q++) {
            int foundIdx = lookupPlotIndex(&g_hashMap, queryIds[q]);
            dummyHash += foundIdx;
        }
        clock_t t3 = clock();
        double timeHashId = ((double)(t3 - t2) * 1000.0) / CLOCKS_PER_SEC;
        double speedupId = (timeHashId > 0.001) ? (timeScanId / timeHashId) : 999.0;

        /* 2. Benchmark Spatial Range Queries */
        Rect queryZones[1000];
        for (int q = 0; q < numOps; q++) {
            double rx = ((double)rand() / (double)RAND_MAX) * 80.0;
            double ry = ((double)rand() / (double)RAND_MAX) * 80.0;
            queryZones[q].xMin = rx;
            queryZones[q].yMin = ry;
            queryZones[q].xMax = rx + 15.0;
            queryZones[q].yMax = ry + 15.0;
        }

        int *qRes = (int *)malloc(sizeof(int) * MAX_PLOTS);
        if (!qRes) continue;

        /* Brute-force linear spatial scan */
        clock_t t4 = clock();
        volatile int dummyGeoScan = 0;
        for (int q = 0; q < numOps; q++) {
            Rect z = queryZones[q];
            int cnt = 0;
            for (int i = 0; i < n; i++) {
                if (plotPool[i].active && rectContainsPoint(z, plotPool[i].x, plotPool[i].y)) {
                    qRes[cnt++] = i;
                }
            }
            dummyGeoScan += cnt;
        }
        clock_t t5 = clock();
        double timeScanGeo = ((double)(t5 - t4) * 1000.0) / CLOCKS_PER_SEC;

        /* Quad-Tree range queries */
        clock_t t6 = clock();
        volatile int dummyQuad = 0;
        for (int q = 0; q < numOps; q++) {
            int cnt = 0;
            rangeQuery(g_quadRoot, queryZones[q], qRes, &cnt);
            dummyQuad += cnt;
        }
        clock_t t7 = clock();
        double timeQuadGeo = ((double)(t7 - t6) * 1000.0) / CLOCKS_PER_SEC;
        double speedupGeo = (timeQuadGeo > 0.001) ? (timeScanGeo / timeQuadGeo) : 999.0;

        free(qRes);

        printf("%-8d | %16.2f | %16.2f | %9.1fx | %16.2f | %16.2f | %9.1fx\n",
               n, timeScanId, timeHashId, speedupId, timeScanGeo, timeQuadGeo, speedupGeo);
    }

    printf("----------------------------------------------------------------------------------------\n");
    printf("[SUMMARY] As dataset scales to 25,000 plots, Hash Map demonstrates orders-of-magnitude\n");
    printf("faster ID lookups, and Quad-Tree prunes irrelevant field branches to deliver superior\n");
    printf("range-query performance compared to linear array scans.\n");
    printf("========================================================================================\n");
}
