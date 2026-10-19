#ifndef AGRIFLOW_QUADTREE_H
#define AGRIFLOW_QUADTREE_H

#include "types.h"

/**
 * Statistics structure for Quad-Tree inspection.
 */
typedef struct {
    int nodeCount;
    int leafCount;
    int maxDepth;
    int totalPlotsIndexed;
} QuadTreeStats;

/**
 * Checks whether a 2D point (x, y) lies inside or on the boundaries of rectangle r.
 * Inclusive on all boundaries: [xMin, xMax] x [yMin, yMax].
 */
int rectContainsPoint(Rect r, double x, double y);

/**
 * Checks whether rectangle a intersects or touches rectangle b.
 */
int rectIntersects(Rect a, Rect b);

/**
 * Allocates and initializes a new QuadNode with the specified boundary and depth.
 */
QuadNode *createQuadNode(Rect boundary, int depth);

/**
 * Subdivides an existing leaf node into four quadrants (NW, NE, SW, SE)
 * and redistributes its existing plots into the newly created children.
 */
void subdivide(QuadNode *node);

/**
 * Inserts a plot index from the shared plot pool into the Quad-Tree.
 * Returns 1 on success, 0 on failure (e.g., out of bounds or allocation error).
 * Safely guards against infinite recursion using MAX_DEPTH.
 */
int insertPlot(QuadNode *node, int plotIndex);

/**
 * Performs a 2D rectangular spatial range query on the Quad-Tree.
 * Prunes subtrees that do not intersect the query zone.
 * Appends matching active plot indices into the result array and updates count.
 * result must have capacity for up to MAX_PLOTS entries.
 */
void rangeQuery(const QuadNode *node, Rect zone, int *result, int *count);

/**
 * Recursively frees all memory allocated by the Quad-Tree.
 */
void freeQuadTree(QuadNode *node);

/**
 * Computes node count, leaf count, max depth, and total indexed plots in the Quad-Tree.
 */
void getQuadTreeStats(const QuadNode *root, QuadTreeStats *stats);

#endif /* AGRIFLOW_QUADTREE_H */
