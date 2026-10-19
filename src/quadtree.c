#include "quadtree.h"
#include "plotpool.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int rectContainsPoint(Rect r, double x, double y) {
    return (x >= r.xMin && x <= r.xMax && y >= r.yMin && y <= r.yMax);
}

int rectIntersects(Rect a, Rect b) {
    return !(b.xMin > a.xMax || b.xMax < a.xMin ||
             b.yMin > a.yMax || b.yMax < a.yMin);
}

QuadNode *createQuadNode(Rect boundary, int depth) {
    QuadNode *node = (QuadNode *)malloc(sizeof(QuadNode));
    if (!node) {
        return NULL;
    }

    node->boundary = boundary;
    node->plotCount = 0;
    node->isLeaf = 1;
    node->depth = depth;
    node->nw = NULL;
    node->ne = NULL;
    node->sw = NULL;
    node->se = NULL;

    node->overflowIndices = NULL;
    node->overflowCount = 0;
    node->overflowCapacity = 0;

    return node;
}

void subdivide(QuadNode *node) {
    if (!node || !node->isLeaf) return;

    double midX = (node->boundary.xMin + node->boundary.xMax) / 2.0;
    double midY = (node->boundary.yMin + node->boundary.yMax) / 2.0;
    Rect r = node->boundary;
    int nextDepth = node->depth + 1;

    node->nw = createQuadNode((Rect){r.xMin, midY, midX, r.yMax}, nextDepth);
    node->ne = createQuadNode((Rect){midX, midY, r.xMax, r.yMax}, nextDepth);
    node->sw = createQuadNode((Rect){r.xMin, r.yMin, midX, midY}, nextDepth);
    node->se = createQuadNode((Rect){midX, r.yMin, r.xMax, midY}, nextDepth);

    if (!node->nw || !node->ne || !node->sw || !node->se) {
        /* Allocation failure during subdivision - remain leaf to preserve data */
        if (node->nw) freeQuadTree(node->nw);
        if (node->ne) freeQuadTree(node->ne);
        if (node->sw) freeQuadTree(node->sw);
        if (node->se) freeQuadTree(node->se);
        node->nw = node->ne = node->sw = node->se = NULL;
        return;
    }

    node->isLeaf = 0;

    /* Re-distribute existing plots into children */
    int existing[MAX_PLOTS_PER_NODE];
    int count = node->plotCount;
    for (int i = 0; i < count; i++) {
        existing[i] = node->plotIndex[i];
    }
    node->plotCount = 0;

    for (int i = 0; i < count; i++) {
        int idx = existing[i];
        if (insertPlot(node->nw, idx)) continue;
        if (insertPlot(node->ne, idx)) continue;
        if (insertPlot(node->sw, idx)) continue;
        if (insertPlot(node->se, idx)) continue;
    }
}

int insertPlot(QuadNode *node, int plotIndex) {
    if (!node || plotIndex < 0 || plotIndex >= plotPoolCount) {
        return 0;
    }

    Plot *p = &plotPool[plotIndex];
    if (!rectContainsPoint(node->boundary, p->x, p->y)) {
        return 0; /* Out of bounding box */
    }

    if (node->isLeaf) {
        if (node->plotCount < MAX_PLOTS_PER_NODE) {
            node->plotIndex[node->plotCount++] = plotIndex;
            return 1;
        }

        /* At leaf capacity: check if maximum depth reached */
        if (node->depth >= MAX_DEPTH) {
            /* Store in leaf overflow dynamic array to avoid infinite subdivision */
            if (node->overflowCount >= node->overflowCapacity) {
                int newCap = (node->overflowCapacity == 0) ? 8 : (node->overflowCapacity * 2);
                int *newBuf = (int *)realloc(node->overflowIndices, sizeof(int) * newCap);
                if (!newBuf) {
                    return 0; /* Allocation failure */
                }
                node->overflowIndices = newBuf;
                node->overflowCapacity = newCap;
            }
            node->overflowIndices[node->overflowCount++] = plotIndex;
            return 1;
        }

        /* Subdivide node into 4 quadrants */
        subdivide(node);
        if (node->isLeaf) {
            /* If subdivision failed due to malloc error, append to overflow */
            if (node->overflowCount >= node->overflowCapacity) {
                int newCap = (node->overflowCapacity == 0) ? 8 : (node->overflowCapacity * 2);
                int *newBuf = (int *)realloc(node->overflowIndices, sizeof(int) * newCap);
                if (!newBuf) return 0;
                node->overflowIndices = newBuf;
                node->overflowCapacity = newCap;
            }
            node->overflowIndices[node->overflowCount++] = plotIndex;
            return 1;
        }
    }

    /* Recurse into children */
    if (insertPlot(node->nw, plotIndex)) return 1;
    if (insertPlot(node->ne, plotIndex)) return 1;
    if (insertPlot(node->sw, plotIndex)) return 1;
    if (insertPlot(node->se, plotIndex)) return 1;

    return 0;
}

void rangeQuery(const QuadNode *node, Rect zone, int *result, int *count) {
    if (!node || !result || !count) return;

    /* Spatial pruning: skip subtrees outside query rectangle */
    if (!rectIntersects(node->boundary, zone)) {
        return;
    }

    if (node->isLeaf) {
        for (int i = 0; i < node->plotCount; i++) {
            int idx = node->plotIndex[i];
            if (idx >= 0 && idx < plotPoolCount && plotPool[idx].active) {
                if (rectContainsPoint(zone, plotPool[idx].x, plotPool[idx].y)) {
                    result[(*count)++] = idx;
                }
            }
        }
        for (int i = 0; i < node->overflowCount; i++) {
            int idx = node->overflowIndices[i];
            if (idx >= 0 && idx < plotPoolCount && plotPool[idx].active) {
                if (rectContainsPoint(zone, plotPool[idx].x, plotPool[idx].y)) {
                    result[(*count)++] = idx;
                }
            }
        }
        return;
    }

    /* Recurse into all 4 quadrants */
    rangeQuery(node->nw, zone, result, count);
    rangeQuery(node->ne, zone, result, count);
    rangeQuery(node->sw, zone, result, count);
    rangeQuery(node->se, zone, result, count);
}

void freeQuadTree(QuadNode *node) {
    if (!node) return;

    if (!node->isLeaf) {
        freeQuadTree(node->nw);
        freeQuadTree(node->ne);
        freeQuadTree(node->sw);
        freeQuadTree(node->se);
    }

    if (node->overflowIndices) {
        free(node->overflowIndices);
        node->overflowIndices = NULL;
    }

    free(node);
}

static void computeStatsRecursive(const QuadNode *node, QuadTreeStats *stats) {
    if (!node) return;

    stats->nodeCount++;

    if (node->isLeaf) {
        stats->leafCount++;
        stats->totalPlotsIndexed += (node->plotCount + node->overflowCount);
        if (node->depth > stats->maxDepth) {
            stats->maxDepth = node->depth;
        }
        return;
    }

    computeStatsRecursive(node->nw, stats);
    computeStatsRecursive(node->ne, stats);
    computeStatsRecursive(node->sw, stats);
    computeStatsRecursive(node->se, stats);
}

void getQuadTreeStats(const QuadNode *root, QuadTreeStats *stats) {
    if (!stats) return;
    stats->nodeCount = 0;
    stats->leafCount = 0;
    stats->maxDepth = 0;
    stats->totalPlotsIndexed = 0;

    if (root) {
        computeStatsRecursive(root, stats);
    }
}
