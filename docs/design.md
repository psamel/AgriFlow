# AgriFlow — Design Summary & Academic Specifications

**Formal Title:** AgriFlow: Geofenced Plot Lookup and Irrigation Priority Scheduler  
**Curriculum Alignment:** Data Structures (316U40C302 / 316U50C302), Semester III, CSBS, K J Somaiya College of Engineering  
**Industry Use Case:** KJS-AGR-01 — Irrigation Advisory System for Sugarcane Crop (KIAAR / Godavari Biorefineries Ltd., Northern Karnataka)  
**Implementation Standard:** ISO C99  

---

## 1. Problem Statement & Industrial Context

In the Northern Karnataka sugarcane belt (Sameerwadi, Bilagi, Mudhol), Godavari Biorefineries Ltd. (GBL) and K J Somaiya Applied Agricultural Research (KIAAR) support **18,000 to 25,000 sugarcane farmers**. Sugarcane is a water-intensive crop requiring between 1,500 and 2,500 mm of water throughout its 12-month lifecycle. However, farmers frequently operate under severe water scarcity and intermittent rural electrical grid power (often restricted to 6–7 hours of 3-phase power per day).

Irrigation decisions historically relied on manual heuristics, leading to moisture stress or excessive water wastage. While GIS boundaries have been digitized for thousands of plots, the operational challenge is real-time decision support:
1. **Spatial Filtering:** Given a specific canal command area, village, or taluka boundary (a 2D bounding box), which plots fall inside it?
2. **Identity-Based Sensor Streams:** Incoming soil moisture probe readings and micro-weather forecasts are tagged by integer `plotId`. How can these readings update the target plot in constant time without full-array searches?
3. **Priority Dispatch under Resource Constraints:** Given daily limits on water pumping volume, which subset of the matched plots should receive irrigation right now?

A naive approach storing plots in a flat array requires $O(n)$ scanning per spatial query, $O(n)$ scanning per sensor reading, and $O(n)$ or $O(k \cdot n)$ sorting every scheduling run. Across 25,000 plots, this naive design fails to scale.

AgriFlow demonstrates how three classical data structures—**Quad-Tree**, **Hash Map**, and **Binary Min-Heap**—solve these challenges with optimal asymptotic complexity.

---

## 2. Architectural Design & Shared Plot Pool

A critical architectural principle of AgriFlow is the **Single Source of Truth** pattern. Plot data is never duplicated across data structures.

```
                     +---------------------------------------+
                     |    plotPool[MAX_PLOTS] (Central Pool)  |
                     |  Single Source of Truth (25,000 max)   |
                     +---------------------------------------+
                        ^                   ^             ^
                        | (plotIndex)       | (plotIndex) | (plotIndex)
                        |                   |             |
           +--------------------+  +------------------+  +--------------------+
           |     Quad-Tree      |  |     Hash Map     |  |  Binary Min-Heap   |
           |  Spatial 2D Index  |  |  ID Lookup Index |  |   Priority Queue   |
           |   (Range Query)    |  |  (Live Updates)  |  |    (Scheduling)    |
           +--------------------+  +------------------+  +--------------------+
```

- **`plotPool`**: Authoritative flat array containing all `Plot` records.
- **Quad-Tree**: Nodes store only `plotIndex` integers. Spatial range queries return arrays of `plotIndex`.
- **Hash Map**: Separate-chaining buckets map `plotId` directly to `plotIndex`. Updates modify `plotPool[plotIndex]` in-place in $O(1)$ average time.
- **Binary Min-Heap**: Temporary priority queue constructed per scheduling cycle, storing `(plotIndex, score)`.

---

## 3. Data Structure Specifications

### 3.1 Spatial Index: Quad-Tree
- **Boundary:** 2D coordinate plane $[0.0, 100.0] \times [0.0, 100.0]$.
- **Capacity:** Leaf nodes hold up to `MAX_PLOTS_PER_NODE = 4` plot indices.
- **Subdivision:** When plot count reaches 4, the leaf subdivides into four quadrants:
  - North-West (NW): $[x_{min}, x_{mid}] \times [y_{mid}, y_{max}]$
  - North-East (NE): $[x_{mid}, x_{max}] \times [y_{mid}, y_{max}]$
  - South-West (SW): $[x_{min}, x_{mid}] \times [y_{min}, y_{mid}]$
  - South-East (SE): $[x_{mid}, x_{max}] \times [y_{min}, y_{mid}]$
- **Degeneracy Guard:** If spatial clustering or co-located plots reach `MAX_DEPTH = 20`, subdivision ceases and entries are placed in a dynamically resized overflow list.
- **Subtree Pruning:** During `rangeQuery(zone)`, if `!rectIntersects(node->boundary, zone)`, the entire subtree is pruned ($O(1)$ rejection).
- **Time Complexity:** Average spatial search $O(\log n + k)$; worst-case $O(n)$ if all points degenerate into a single quadrant. Space $O(n)$.

### 3.2 Key-Value Index: Hash Map
- **Hash Function:** Knuth's Multiplicative Fibonacci Hash:
  $$h(\text{plotId}) = ((\text{unsigned int})\text{plotId} \times 2654435761u) \pmod{4099}$$
- **Table Size:** `HASH_TABLE_SIZE = 4099` (prime number, maximizing bucket distribution).
- **Collision Resolution:** Separate chaining using singly linked `HashNode` lists.
- **Duplicate Prevention:** Insertion walks the target chain; if `plotId` exists, insertion is rejected.
- **Time Complexity:** Average lookup and update $O(1)$; worst-case $O(n)$ under deliberate hash collision. Space $O(n)$.

### 3.3 Priority Queue: Binary Min-Heap
- **Key Convention:** Min-heap where **lower score = higher irrigation priority**.
- **Urgency Formula:**
  $$\text{urgencyScore} = \text{soilMoisture} + (\text{rainForecastMM} \times 0.5) - (\text{daysSinceIrrigation} \times 2.0)$$
  - High soil moisture $\implies$ higher score $\implies$ lower priority.
  - Higher rain forecast $\implies$ higher score $\implies$ delays watering.
  - Higher days overdue $\implies$ lower score $\implies$ higher priority.
- **Tie-Breaker:** Deterministic ordering by lower `plotId` when scores are identical ($|\Delta| < 10^{-9}$).
- **Heap Operations:**
  - `push()`: Appends item at index $i$, then performs sift-up in $O(\log k)$.
  - `extractMin()`: Replaces root with last element, then performs sift-down in $O(\log k)$.
- **Time Complexity:** $O(\log k)$ per push and extract. Full schedule generation for $k$ matched plots takes $O(k \log k)$ time and $O(k)$ memory.

---

## 4. Academic Justification & Trade-Off Matrix

| Operation | Alternative Considered | Chosen Data Structure | Asymptotic Trade-Off | Academic Justification |
|---|---|---|---|---|
| **Geographic Zone Query** | Flat array linear scan | **Quad-Tree** | $O(n)$ vs $O(\log n + k)$ | Scanning 25,000 plots for taluka queries is unviable. Quad-tree dynamically subdivides dense clusters while pruning empty zones. |
| **Zone Query** | Uniform fixed grid | **Quad-Tree** | $O(1)$ best / $O(n)$ cluster vs $O(\log n + k)$ | Farmland density is highly non-uniform across talukas; fixed grid cells overflow into huge linked lists. |
| **Plot ID Lookup** | Linear scan of pool | **Hash Map** | $O(n)$ vs $O(1)$ avg | Sensor readings stream continuously. An $O(n)$ scan per reading causes severe scheduling bottlenecks. |
| **Plot ID Lookup** | Self-balancing BST (AVL) | **Hash Map** | $O(\log n)$ vs $O(1)$ avg | Plot IDs are random integers not requiring in-order traversal. AVL tree balancing overhead is unnecessary. |
| **Urgency Scheduling**| Full array sorting | **Binary Min-Heap** | $O(k \log k)$ full sort vs $O(m \log k)$ partial extraction | When water budget only covers $m \ll k$ plots, Min-Heap extracts exactly $m$ items in $O(m \log k)$ without sorting all $k$ items. |
| **Urgency Scheduling**| Unsorted list scan | **Binary Min-Heap** | $O(m \cdot k)$ vs $O(m \log k)$ | Repeatedly searching an unsorted list for the minimum plot is inefficient when extracting dozens of plots. |

---

## 5. Walkthrough Verification Logic

The implementation mirrors Section 5 of the design document:
- Field: $100 \times 100$. Query Zone: $[0, 0] \times [50, 50]$. Budget: 30.0 units ($10.0$ units/plot).
- In-Zone plots:
  - P1: ID 1001, moisture 18%, days 5, rain 0 mm $\implies \text{Score} = 18 - 10 = 8.00$
  - P3: ID 1003, moisture 25%, days 3, rain 0 mm $\implies \text{Score} = 25 - 6 = 19.00$
  - P2: ID 1042, moisture 42%, days 1, rain 0 mm $\implies \text{Score} = 42 - 2 = 40.00$
- **Initial Schedule:** $P1 (8.00) \to P3 (19.00) \to P2 (40.00)$
- **Live Sensor Update:** Plot 1042 updated to 15.0% moisture via Hash Map.
  $$\text{New Score}(P2) = 15 - 2 = 13.00$$
- **Regenerated Schedule:** $P1 (8.00) \to P2 (13.00) \to P3 (19.00)$ (P2 promoted to 2nd position).
