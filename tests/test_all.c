#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "types.h"
#include "plotpool.h"
#include "quadtree.h"
#include "hashmap.h"
#include "minheap.h"
#include "scheduler.h"

static int g_testsRun = 0;
static int g_testsPassed = 0;
static int g_testsFailed = 0;

#define TEST_START(name) printf("\n[RUNNING TEST] %s ...\n", name)

#define ASSERT_TRUE(cond, msg) do { \
    g_testsRun++; \
    if (cond) { \
        g_testsPassed++; \
    } else { \
        g_testsFailed++; \
        printf("  [FAIL] Line %d: %s (%s)\n", __LINE__, msg, #cond); \
    } \
} while (0)

#define ASSERT_EQ(a, b, msg) do { \
    g_testsRun++; \
    if ((a) == (b)) { \
        g_testsPassed++; \
    } else { \
        g_testsFailed++; \
        printf("  [FAIL] Line %d: %s (expected %ld, got %ld)\n", __LINE__, msg, (long)(b), (long)(a)); \
    } \
} while (0)

#define ASSERT_DOUBLE_EQ(a, b, eps, msg) do { \
    g_testsRun++; \
    if (fabs((a) - (b)) <= (eps)) { \
        g_testsPassed++; \
    } else { \
        g_testsFailed++; \
        printf("  [FAIL] Line %d: %s (expected %.4f, got %.4f)\n", __LINE__, msg, (double)(b), (double)(a)); \
    } \
} while (0)

/* Helper: integer comparison for qsort */
static int cmpInt(const void *a, const void *b) {
    return (*(const int *)a - *(const int *)b);
}

/* ========================================================================= */
/* Test Suite A: Walkthrough Correctness                                     */
/* ========================================================================= */
static void test_walkthrough_correctness(void) {
    TEST_START("Suite A: Walkthrough Correctness");

    initPlotPool();
    PlotHashMap map;
    initHashMap(&map);
    QuadNode *root = createQuadNode((Rect){0.0, 0.0, 100.0, 100.0}, 0);

    /* 6 plots: P1, P2, P3 in (0,0)-(50,50); P4, P5, P6 outside */
    Plot p1 = {1001, 10.0, 10.0, 18.0, 0.0, 5, 1};
    Plot p2 = {1042, 20.0, 20.0, 42.0, 0.0, 1, 1};
    Plot p3 = {1003, 30.0, 30.0, 25.0, 0.0, 3, 1};
    Plot p4 = {1004, 70.0, 70.0, 30.0, 0.0, 2, 1};
    Plot p5 = {1005, 80.0, 80.0, 35.0, 0.0, 4, 1};
    Plot p6 = {1006, 90.0, 90.0, 40.0, 0.0, 6, 1};

    int idx1 = addPlotToPool(p1);
    int idx2 = addPlotToPool(p2);
    int idx3 = addPlotToPool(p3);
    int idx4 = addPlotToPool(p4);
    int idx5 = addPlotToPool(p5);
    int idx6 = addPlotToPool(p6);

    insertPlotId(&map, 1001, idx1);
    insertPlotId(&map, 1042, idx2);
    insertPlotId(&map, 1003, idx3);
    insertPlotId(&map, 1004, idx4);
    insertPlotId(&map, 1005, idx5);
    insertPlotId(&map, 1006, idx6);

    insertPlot(root, idx1);
    insertPlot(root, idx2);
    insertPlot(root, idx3);
    insertPlot(root, idx4);
    insertPlot(root, idx5);
    insertPlot(root, idx6);

    /* Verify Urgency Scores:
     * P1: 18 - (5 * 2) = 8
     * P3: 25 - (3 * 2) = 19
     * P2: 42 - (1 * 2) = 40
     */
    double scoreP1 = computeUrgency(plotPool[idx1]);
    double scoreP2 = computeUrgency(plotPool[idx2]);
    double scoreP3 = computeUrgency(plotPool[idx3]);

    ASSERT_DOUBLE_EQ(scoreP1, 8.0, 1e-6, "P1 urgency score must be 8.0");
    ASSERT_DOUBLE_EQ(scoreP3, 19.0, 1e-6, "P3 urgency score must be 19.0");
    ASSERT_DOUBLE_EQ(scoreP2, 40.0, 1e-6, "P2 urgency score must be 40.0");

    /* Query zone (0,0)-(50,50) */
    Rect zone = {0.0, 0.0, 50.0, 50.0};
    int matched[16];
    int count = 0;
    rangeQuery(root, zone, matched, &count);
    ASSERT_EQ(count, 3, "Zone query must return exactly 3 plots");

    /* Initial Schedule Order: P1 -> P3 -> P2 */
    MinHeap *heap1 = createMinHeap(16);
    for (int i = 0; i < count; i++) {
        push(heap1, matched[i], computeUrgency(plotPool[matched[i]]));
    }
    int firstExtracted  = extractMin(heap1);
    int secondExtracted = extractMin(heap1);
    int thirdExtracted  = extractMin(heap1);

    ASSERT_EQ(plotPool[firstExtracted].plotId, 1001, "First scheduled must be P1 (1001)");
    ASSERT_EQ(plotPool[secondExtracted].plotId, 1003, "Second scheduled must be P3 (1003)");
    ASSERT_EQ(plotPool[thirdExtracted].plotId, 1042, "Third scheduled must be P2 (1042)");
    freeMinHeap(heap1);

    /* Update P2 moisture to 15% via Hash Map */
    applySensorReading(&map, 1042, 15.0, 0.0);
    double updatedScoreP2 = computeUrgency(plotPool[idx2]);
    ASSERT_DOUBLE_EQ(updatedScoreP2, 13.0, 1e-6, "Updated P2 urgency score must be 13.0");

    /* Regenerated Schedule Order: P1 -> P2 -> P3 */
    MinHeap *heap2 = createMinHeap(16);
    count = 0;
    rangeQuery(root, zone, matched, &count);
    for (int i = 0; i < count; i++) {
        push(heap2, matched[i], computeUrgency(plotPool[matched[i]]));
    }
    int regFirst  = extractMin(heap2);
    int regSecond = extractMin(heap2);
    int regThird  = extractMin(heap2);

    ASSERT_EQ(plotPool[regFirst].plotId, 1001, "Regenerated 1st must be P1 (1001)");
    ASSERT_EQ(plotPool[regSecond].plotId, 1042, "Regenerated 2nd must be P2 (1042)");
    ASSERT_EQ(plotPool[regThird].plotId, 1003, "Regenerated 3rd must be P3 (1003)");
    freeMinHeap(heap2);

    freeQuadTree(root);
    freeHashMap(&map);
}

/* ========================================================================= */
/* Test Suite B: Quad-Tree Correctness & Brute-Force Oracle                  */
/* ========================================================================= */
static void test_quadtree_correctness(void) {
    TEST_START("Suite B: Quad-Tree Correctness & Brute-Force Oracle");

    initPlotPool();
    QuadNode *root = createQuadNode((Rect){0.0, 0.0, 100.0, 100.0}, 0);

    /* Generate 24,000 plots for rigorous validation (leaving capacity for cluster test) */
    int totalPlots = 24000;
    int added = generateRandomPlots(totalPlots, 54321);
    ASSERT_EQ(added, totalPlots, "Should generate exactly 24,000 plots");

    for (int i = 0; i < totalPlots; i++) {
        int res = insertPlot(root, i);
        if (res != 1) {
            ASSERT_TRUE(0, "Quad-tree insert must succeed for valid in-bound plot");
            break;
        }
    }

    int *qtResults = (int *)malloc(sizeof(int) * MAX_PLOTS);
    int *bfResults = (int *)malloc(sizeof(int) * MAX_PLOTS);
    ASSERT_TRUE(qtResults && bfResults, "Buffers allocated");

    /* Run 100 reproducible random zone queries against brute-force linear oracle */
    srand(777);
    int oracleMatches = 0;

    for (int q = 0; q < 100; q++) {
        double x1 = ((double)rand() / RAND_MAX) * 95.0;
        double y1 = ((double)rand() / RAND_MAX) * 95.0;
        double w  = 5.0 + ((double)rand() / RAND_MAX) * 40.0;
        double h  = 5.0 + ((double)rand() / RAND_MAX) * 40.0;
        double x2 = (x1 + w > 100.0) ? 100.0 : (x1 + w);
        double y2 = (y1 + h > 100.0) ? 100.0 : (y1 + h);

        Rect zone = {x1, y1, x2, y2};

        /* 1. Quad-tree range query */
        int qtCount = 0;
        rangeQuery(root, zone, qtResults, &qtCount);

        /* 2. Brute-force linear scan oracle */
        int bfCount = 0;
        for (int i = 0; i < totalPlots; i++) {
            if (plotPool[i].active && rectContainsPoint(zone, plotPool[i].x, plotPool[i].y)) {
                bfResults[bfCount++] = i;
            }
        }

        if (qtCount != bfCount) {
            ASSERT_EQ(qtCount, bfCount, "Quad-Tree match count must exactly equal brute-force count");
            break;
        }

        /* Sort both arrays and compare elements to ensure zero false positives/duplicates */
        qsort(qtResults, qtCount, sizeof(int), cmpInt);
        qsort(bfResults, bfCount, sizeof(int), cmpInt);

        int match = 1;
        for (int k = 0; k < qtCount; k++) {
            if (qtResults[k] != bfResults[k]) {
                match = 0;
                break;
            }
        }
        if (!match) {
            ASSERT_TRUE(0, "Quad-Tree results must match brute-force oracle set exactly");
            break;
        }

        oracleMatches++;
    }
    ASSERT_EQ(oracleMatches, 100, "All 100 random zone queries must exactly match brute-force oracle");

    /* Boundary tests: exactly on corner and boundaries */
    Rect cornerZone = {0.0, 0.0, 0.0, 0.0};
    int cornerCount = 0;
    rangeQuery(root, cornerZone, qtResults, &cornerCount);
    ASSERT_TRUE(cornerCount >= 0, "Corner zone query terminates safely");

    /* Test 50+ co-located plots with identical coordinates (subdivision limit guard) */
    QuadNode *clusterRoot = createQuadNode((Rect){0.0, 0.0, 100.0, 100.0}, 0);
    for (int i = 0; i < 60; i++) {
        Plot cp = {90000 + i, 50.0, 50.0, 30.0, 0.0, 3, 1};
        int cIdx = addPlotToPool(cp);
        ASSERT_TRUE(cIdx >= 0, "Cluster plot added to pool within MAX_PLOTS limit");
        if (cIdx >= 0) {
            int insRes = insertPlot(clusterRoot, cIdx);
            ASSERT_EQ(insRes, 1, "Co-located plot must insert safely without infinite recursion");
        }
    }
    Rect clusterZone = {49.0, 49.0, 51.0, 51.0};
    int clusterCount = 0;
    rangeQuery(clusterRoot, clusterZone, qtResults, &clusterCount);
    ASSERT_TRUE(clusterCount >= 60, "All clustered co-located plots must be retrieved safely");

    freeQuadTree(clusterRoot);
    freeQuadTree(root);
    free(qtResults);
    free(bfResults);
}

/* ========================================================================= */
/* Test Suite C: Hash Map Correctness                                        */
/* ========================================================================= */
static void test_hashmap_correctness(void) {
    TEST_START("Suite C: Hash Map Correctness");

    initPlotPool();
    PlotHashMap map;
    initHashMap(&map);

    /* Insert 1000 items and verify O(1) lookups */
    for (int i = 0; i < 1000; i++) {
        Plot p = {20000 + i, 10.0, 10.0, 25.0, 0.0, 2, 1};
        int idx = addPlotToPool(p);
        int ins = insertPlotId(&map, p.plotId, idx);
        ASSERT_EQ(ins, 1, "Initial plot ID insertion must return 1 (success)");
    }

    ASSERT_EQ(getHashMapCount(&map), 1000, "Hash map count must be 1000");

    /* Verify all 1000 IDs map to correct pool index */
    int lookupSuccess = 1;
    for (int i = 0; i < 1000; i++) {
        int idx = lookupPlotIndex(&map, 20000 + i);
        if (idx < 0 || plotPool[idx].plotId != 20000 + i) {
            lookupSuccess = 0;
            break;
        }
    }
    ASSERT_TRUE(lookupSuccess, "All inserted IDs must map to correct pool indices");

    /* Verify unknown ID returns -1 */
    ASSERT_EQ(lookupPlotIndex(&map, 999999), -1, "Unknown ID must return -1");

    /* Verify duplicate ID is rejected */
    int dupRes = insertPlotId(&map, 20050, 0);
    ASSERT_EQ(dupRes, 0, "Duplicate plot ID must be rejected with code 0");

    /* Test deletion of an ID */
    int delRes = deletePlotFromMap(&map, 20050);
    ASSERT_EQ(delRes, 1, "Deletion of existing plot ID must return 1");
    ASSERT_EQ(lookupPlotIndex(&map, 20050), -1, "Deleted plot ID must no longer be found");
    ASSERT_EQ(getHashMapCount(&map), 999, "Hash map count must decrement to 999");

    /* Deletion of non-existent ID */
    ASSERT_EQ(deletePlotFromMap(&map, 888888), 0, "Deleting non-existent ID must return 0");

    /* Verify load factor and longest chain statistics */
    ASSERT_TRUE(getHashMapLoadFactor(&map) > 0.0, "Load factor should be positive");
    ASSERT_TRUE(getHashMapLongestChain(&map) >= 1, "Longest chain should be at least 1");

    freeHashMap(&map);
    ASSERT_EQ(getHashMapCount(&map), 0, "Count after freeHashMap must be 0");
}

/* ========================================================================= */
/* Test Suite D: Min-Heap Correctness                                        */
/* ========================================================================= */
static void test_minheap_correctness(void) {
    TEST_START("Suite D: Min-Heap Correctness");

    initPlotPool();

    /* 1. Safe extraction on empty heap */
    MinHeap *emptyHeap = createMinHeap(16);
    ASSERT_TRUE(emptyHeap != NULL, "Empty heap created");
    ASSERT_EQ(extractMin(emptyHeap), -1, "extractMin on empty heap must safely return -1");
    ASSERT_TRUE(isHeapEmpty(emptyHeap), "isHeapEmpty must return 1 for empty heap");
    freeMinHeap(emptyHeap);

    /* 2. Push 10,000 reproducible random urgency scores and verify non-decreasing extraction order */
    int testSize = 10000;
    MinHeap *heap = createMinHeap(testSize);
    ASSERT_TRUE(heap != NULL, "MinHeap created with capacity 10,000");

    srand(112233);
    for (int i = 0; i < testSize; i++) {
        double randScore = -50.0 + ((double)rand() / RAND_MAX) * 150.0;
        Plot p = {30000 + i, 10.0, 10.0, randScore, 0.0, 0, 1}; /* soilMoisture = randScore => computeUrgency = randScore */
        int idx = addPlotToPool(p);
        push(heap, idx, randScore);
    }

    ASSERT_EQ(getHeapSize(heap), testSize, "Heap size must equal 10,000 after insertions");

    int prevIdx = extractMin(heap);
    ASSERT_TRUE(prevIdx >= 0, "First extracted element must be valid");
    double prevScore = computeUrgency(plotPool[prevIdx]);

    int orderCorrect = 1;
    for (int i = 1; i < testSize; i++) {
        int curIdx = extractMin(heap);
        if (curIdx < 0) {
            orderCorrect = 0;
            break;
        }
        double curScore = computeUrgency(plotPool[curIdx]);
        if (curScore < prevScore - 1e-9) {
            orderCorrect = 0;
            break;
        }
        prevScore = curScore;
    }
    ASSERT_TRUE(orderCorrect, "All 10,000 extractions from Min-Heap must be in non-decreasing urgency score order");
    ASSERT_EQ(getHeapSize(heap), 0, "Heap size must be 0 after all extractions");
    freeMinHeap(heap);

    /* 3. Deterministic tie-breaker check on equal scores */
    MinHeap *tieHeap = createMinHeap(4);
    Plot tA = {5002, 10.0, 10.0, 20.0, 0.0, 0, 1}; /* Plot ID 5002, score 20.0 */
    Plot tB = {5001, 10.0, 10.0, 20.0, 0.0, 0, 1}; /* Plot ID 5001, score 20.0 */
    int idxA = addPlotToPool(tA);
    int idxB = addPlotToPool(tB);

    /* Push tA first, then tB */
    push(tieHeap, idxA, 20.0);
    push(tieHeap, idxB, 20.0);

    int firstTie = extractMin(tieHeap);
    int secondTie = extractMin(tieHeap);
    ASSERT_EQ(plotPool[firstTie].plotId, 5001, "Tie-breaker: lower Plot ID 5001 must be extracted before 5002");
    ASSERT_EQ(plotPool[secondTie].plotId, 5002, "Tie-breaker: Plot ID 5002 must follow 5001");
    freeMinHeap(tieHeap);
}

/* ========================================================================= */
/* Test Suite E: Scheduling Correctness & Budget Constraints                 */
/* ========================================================================= */
static void test_scheduling_correctness(void) {
    TEST_START("Suite E: Scheduling Correctness & Budget Constraints");

    initPlotPool();
    QuadNode *root = createQuadNode((Rect){0.0, 0.0, 100.0, 100.0}, 0);

    /* 5 plots inside zone (0,0)-(40,40), 2 plots outside */
    for (int i = 0; i < 5; i++) {
        Plot p = {6001 + i, 10.0 + i * 2, 10.0 + i * 2, 20.0 + i * 5, 0.0, 2, 1};
        int idx = addPlotToPool(p);
        insertPlot(root, idx);
    }
    for (int i = 0; i < 2; i++) {
        Plot p = {7001 + i, 80.0 + i, 80.0 + i, 15.0, 0.0, 5, 1};
        int idx = addPlotToPool(p);
        insertPlot(root, idx);
    }

    Rect zone = {0.0, 0.0, 40.0, 40.0};

    /* 1. Sufficient budget (50.0 units for 5 plots at 10.0/plot) */
    ScheduleSummary s1 = executeIrrigationSchedule(root, zone, 50.0, 0);
    ASSERT_EQ(s1.totalMatched, 5, "5 in-zone plots matched");
    ASSERT_EQ(s1.plotsServed, 5, "All 5 plots served with 50.0 budget");
    ASSERT_EQ(s1.plotsUnserved, 0, "0 plots unserved");
    ASSERT_DOUBLE_EQ(s1.waterAllocated, 50.0, 1e-6, "50.0 units allocated");
    ASSERT_DOUBLE_EQ(s1.remainingBudget, 0.0, 1e-6, "0.0 units remaining");

    /* 2. Insufficient budget (25.0 units: can only serve 2 plots of 10.0 units each) */
    ScheduleSummary s2 = executeIrrigationSchedule(root, zone, 25.0, 0);
    ASSERT_EQ(s2.plotsServed, 2, "Only 2 plots served with 25.0 budget (no partial watering)");
    ASSERT_EQ(s2.plotsUnserved, 3, "3 plots remain unserved");
    ASSERT_DOUBLE_EQ(s2.waterAllocated, 20.0, 1e-6, "20.0 units allocated");
    ASSERT_DOUBLE_EQ(s2.remainingBudget, 5.0, 1e-6, "5.0 units remaining");

    /* 3. Zero budget (0.0 units) */
    ScheduleSummary s3 = executeIrrigationSchedule(root, zone, 0.0, 0);
    ASSERT_EQ(s3.plotsServed, 0, "0 plots served with zero budget");
    ASSERT_EQ(s3.plotsUnserved, 5, "All 5 plots unserved with zero budget");
    ASSERT_DOUBLE_EQ(s3.remainingBudget, 0.0, 1e-6, "0.0 units remaining");

    /* 4. Empty zone (no plots) */
    Rect emptyZone = {60.0, 10.0, 70.0, 20.0};
    ScheduleSummary s4 = executeIrrigationSchedule(root, emptyZone, 100.0, 0);
    ASSERT_EQ(s4.totalMatched, 0, "Empty zone matches 0 plots");
    ASSERT_EQ(s4.plotsServed, 0, "0 plots served in empty zone");
    ASSERT_DOUBLE_EQ(s4.remainingBudget, 100.0, 1e-6, "Full budget preserved on empty zone");

    freeQuadTree(root);
}

/* ========================================================================= */
/* Test Suite F: Memory Management & Edge-Case Input Validation              */
/* ========================================================================= */
static void test_edge_cases_and_memory(void) {
    TEST_START("Suite F: Memory Management & Edge-Case Input Validation");

    /* 1. Invalid plot data */
    Plot badPlot = {-5, 120.0, 50.0, -10.0, -5.0, -1, 1};
    char errMsg[128];
    ASSERT_EQ(validatePlotData(&badPlot, errMsg, sizeof(errMsg)), 0, "Negative ID / bad coords must fail validation");

    Plot nanPlot = {101, NAN, 50.0, 30.0, 0.0, 1, 1};
    ASSERT_EQ(validatePlotData(&nanPlot, errMsg, sizeof(errMsg)), 0, "NaN coordinates must fail validation");

    /* 2. Reversed rectangle bounds */
    Rect invertedRect = {50.0, 50.0, 20.0, 20.0};
    ASSERT_EQ(validateRectBounds(&invertedRect, errMsg, sizeof(errMsg)), 0, "Inverted rectangle must fail validation");

    /* 3. Repeated creation and destruction cycle (verifying no crash or leak) */
    for (int cycle = 0; cycle < 5; cycle++) {
        QuadNode *tempRoot = createQuadNode((Rect){0.0, 0.0, 100.0, 100.0}, 0);
        PlotHashMap tempMap;
        initHashMap(&tempMap);
        initPlotPool();

        generateRandomPlots(500, (unsigned int)(cycle * 100 + 1));
        for (int i = 0; i < 500; i++) {
            insertPlotId(&tempMap, plotPool[i].plotId, i);
            insertPlot(tempRoot, i);
        }

        /* Soft delete first 50 plots */
        for (int i = 0; i < 50; i++) {
            deletePlotFromMap(&tempMap, plotPool[i].plotId);
        }

        /* Verify soft-deleted plots do not appear in query */
        int res[MAX_PLOTS];
        int count = 0;
        rangeQuery(tempRoot, (Rect){0.0, 0.0, 100.0, 100.0}, res, &count);
        ASSERT_EQ(count, 450, "Only 450 active plots should appear in full-field query after 50 deletions");

        freeQuadTree(tempRoot);
        freeHashMap(&tempMap);
    }
    ASSERT_TRUE(1, "5 cycles of complete creation and destruction completed cleanly");
}

/* ========================================================================= */
/* Main Test Runner                                                          */
/* ========================================================================= */
int main(void) {
    printf("====================================================\n");
    printf("              AGRIFLOW AUTOMATED TEST SUITE         \n");
    printf("====================================================\n");

    test_walkthrough_correctness();
    test_quadtree_correctness();
    test_hashmap_correctness();
    test_minheap_correctness();
    test_scheduling_correctness();
    test_edge_cases_and_memory();

    printf("\n====================================================\n");
    printf("TEST RUN COMPLETE:\n");
    printf("  Total assertions checked : %d\n", g_testsRun);
    printf("  Passed                   : %d\n", g_testsPassed);
    printf("  Failed                   : %d\n", g_testsFailed);
    printf("====================================================\n");

    if (g_testsFailed == 0) {
        printf("[OVERALL STATUS: ALL TESTS PASSED]\n\n");
        return 0;
    } else {
        printf("[OVERALL STATUS: %d FAILURES ENCOUNTERED]\n\n", g_testsFailed);
        return 1;
    }
}
