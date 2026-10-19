#ifndef AGRIFLOW_C_API_H
#define AGRIFLOW_C_API_H

#include "types.h"
#include "scheduler.h"
#include "quadtree.h"
#include "hashmap.h"
#include "plotpool.h"

#ifdef __cplusplus
extern "C" {
#endif

/* Export macro for Windows DLL */
#ifdef _WIN32
#define AGRIFLOW_API __declspec(dllexport)
#else
#define AGRIFLOW_API
#endif

/* API: Schedule Item */
typedef struct {
    int    plotId;
    double x;
    double y;
    double soilMoisture;
    double rainForecastMM;
    int    daysSinceIrrigation;
    double urgencyScore;
    double waterAllocated;
    int    served;
} ApiScheduleItem;

/* API: System and Data Structure Statistics */
typedef struct {
    int    totalPlots;
    int    activePlots;
    int    inactivePlots;
    double avgMoisture;
    int    needsAttentionCount;
    int    qtNodeCount;
    int    qtLeafCount;
    int    qtMaxDepth;
    int    qtPlotsIndexed;
    int    hashCount;
    int    hashLongestChain;
    double hashLoadFactor;
} ApiSystemStats;

/* Lifecycle: Initialize / Reset Engine */
AGRIFLOW_API void api_init(void);
AGRIFLOW_API void api_reset(void);
AGRIFLOW_API void api_cleanup(void);

/* Lifecycle: Sample Data Loading */
AGRIFLOW_API int  api_load_samples(int count, unsigned int seed);

/* Plot Management: Add / Lookup / List / Delete */
AGRIFLOW_API int  api_add_plot(int plotId, double x, double y, double moisture, double rain, int daysOverdue, char *errBuf, int errBufSize);
AGRIFLOW_API int  api_get_plot_by_id(int plotId, Plot *outPlot, double *outScore);
AGRIFLOW_API int  api_get_all_plots(Plot *outPlots, double *outScores, int maxPlots, int *outCount);
AGRIFLOW_API int  api_delete_plot(int plotId);

/* Spatial Index: Quad-Tree Range Query */
AGRIFLOW_API int  api_range_query(double xMin, double yMin, double xMax, double yMax, Plot *outPlots, double *outScores, int maxPlots, int *outCount, char *errBuf, int errBufSize);

/* Key-Value Index: Hash Map Sensor Update */
AGRIFLOW_API int  api_update_sensor(int plotId, double moisture, double rain, double *outOldScore, double *outNewScore, char *errBuf, int errBufSize);

/* Priority Queue: Min-Heap Irrigation Scheduler */
AGRIFLOW_API int  api_schedule_irrigation(double xMin, double yMin, double xMax, double yMax, double waterBudget, ApiScheduleItem *outItems, int maxItems, int *outItemCount, ScheduleSummary *outSummary, char *errBuf, int errBufSize);

/* Telemetry: System and Data Structure Statistics */
AGRIFLOW_API void api_get_system_stats(ApiSystemStats *stats);

/* Walkthrough: Setup the 6-plot scenario */
AGRIFLOW_API void api_setup_walkthrough(void);

#ifdef __cplusplus
}
#endif

#endif /* AGRIFLOW_C_API_H */
