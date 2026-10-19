#ifndef AGRIFLOW_TYPES_H
#define AGRIFLOW_TYPES_H

#include <stddef.h>

/* Academic and system constants */
#define MAX_PLOTS           25000
#define MAX_PLOTS_PER_NODE  4
#define HASH_TABLE_SIZE     4099      /* Prime number for low collision rate */
#define MAX_DEPTH           20        /* Guard against infinite recursion on co-located plots */
#define WATER_PER_PLOT      10.0      /* Fixed water volume requirement in liters/units */

/* Coordinate boundary constraints for simulated sugarcane field */
#define FIELD_MIN_COORD     0.0
#define FIELD_MAX_COORD     100.0

/* Sensor value boundaries for validation */
#define MIN_SOIL_MOISTURE   0.0
#define MAX_SOIL_MOISTURE   100.0
#define MIN_RAIN_FORECAST   0.0
#define MAX_RAIN_FORECAST   500.0
#define MIN_DAYS_IRRIGATION 0
#define MAX_DAYS_IRRIGATION 365

/**
 * Plot: Single source of truth record for a sugarcane farm plot.
 * Stored centrally in the plot pool; all other structures reference its index.
 */
typedef struct {
    int    plotId;               /* Unique positive identifier */
    double x, y;                 /* GPS-style 2D planar coordinates [0.0, 100.0] */
    double soilMoisture;         /* Volumetric soil moisture percentage [0, 100] */
    double rainForecastMM;       /* 24-48h forecast precipitation in mm */
    int    daysSinceIrrigation;  /* Days elapsed since last watering cycle */
    int    active;               /* 1 if active, 0 if deleted/inactive */
} Plot;

/**
 * Rect: Axis-aligned rectangular bounding box for geographic regions and Quad-Tree nodes.
 */
typedef struct {
    double xMin, yMin, xMax, yMax;
} Rect;

/**
 * QuadNode: Node within the spatial Quad-Tree index.
 * Stores plot indices rather than duplicate plot copies.
 */
typedef struct QuadNode {
    Rect boundary;
    int  plotIndex[MAX_PLOTS_PER_NODE]; /* Primary bucket for leaf entries */
    int  plotCount;                     /* Number of plots in primary bucket */
    int  isLeaf;                        /* 1 if leaf node, 0 if internal branch */
    int  depth;                         /* Depth level in the tree (root = 0) */
    struct QuadNode *nw, *ne, *sw, *se; /* Four quadrant children */

    /* Overflow storage for handling clustered points at MAX_DEPTH */
    int *overflowIndices;
    int  overflowCount;
    int  overflowCapacity;
} QuadNode;

/**
 * HashNode: Linked-list collision node for separate chaining in PlotHashMap.
 */
typedef struct HashNode {
    int plotId;
    int plotIndex;                      /* Index into the shared plot pool */
    struct HashNode *next;
} HashNode;

/**
 * PlotHashMap: Hash table mapping unique plot IDs to plot pool indices in O(1) avg time.
 */
typedef struct {
    HashNode *buckets[HASH_TABLE_SIZE];
    int count;                          /* Total number of active mappings */
} PlotHashMap;

/**
 * HeapItem: Entry in the Binary Min-Heap priority queue.
 */
typedef struct {
    int    plotIndex;                   /* Index into the shared plot pool */
    double score;                       /* Urgency score (lower = more urgent) */
} HeapItem;

/**
 * MinHeap: Binary min-heap for priority scheduling.
 * Dynamically allocated to safely handle up to MAX_PLOTS entries without stack overflow.
 */
typedef struct {
    HeapItem *items;
    int       size;
    int       capacity;
} MinHeap;

#endif /* AGRIFLOW_TYPES_H */
