// Data Structures Academic Educational Page
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { IconDataStructures, IconCpu, IconRefresh } from '../components/Icons';

export default function DataStructures() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await api.getStatistics();
      setStats(data);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="page-container">
      {/* Live C Engine Telemetry Panel */}
      <div className="card card-forest">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Live Telemetry from C Engine
            </span>
            <h3 className="card-title" style={{ margin: 0 }}>
              <span>Memory &amp; Data Structure Diagnostics</span>
            </h3>
          </div>
          <button className="btn btn-outline btn-sm" onClick={fetchStats} disabled={loading} style={{ color: 'var(--color-gold)', borderColor: 'var(--color-gold-border)' }}>
            <IconRefresh size={14} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {stats && (
          <div className="grid-4" style={{ gap: '14px' }}>
            <div style={{ backgroundColor: 'var(--color-forest-surface)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>Quad-Tree Nodes</div>
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}>
                {stats.quadTree.nodeCount} ({stats.quadTree.leafCount} leaves)
              </div>
              <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Max Depth: {stats.quadTree.maxDepth} / 20</div>
            </div>

            <div style={{ backgroundColor: 'var(--color-forest-surface)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>Hash Map Load Factor</div>
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}>
                {stats.hashMap.loadFactor}
              </div>
              <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Buckets: {stats.hashMap.bucketSize} (Prime)</div>
            </div>

            <div style={{ backgroundColor: 'var(--color-forest-surface)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>Longest Hash Chain</div>
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}>
                {stats.hashMap.longestChain} nodes
              </div>
              <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Separate Chaining</div>
            </div>

            <div style={{ backgroundColor: 'var(--color-forest-surface)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>Plot Pool Capacity</div>
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}>
                {stats.plots.active} / 25,000
              </div>
              <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Single Source of Truth</div>
            </div>
          </div>
        )}
      </div>

      {/* Shared Plot Pool Architecture Banner */}
      <div className="card" style={{ borderLeft: '4px solid var(--color-gold)' }}>
        <h3 className="card-title">
          <span>1. Shared Plot Pool Pattern (Single Source of Truth)</span>
        </h3>
        <p className="card-subtitle" style={{ marginBottom: '12px' }}>
          Memory ownership design: eliminates data duplication and guarantees immediate update propagation.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.84rem', color: '#334D46', marginBottom: '10px', lineHeight: 1.6 }}>
              In naive systems, updating a farm plot requires updating redundant copies stored across spatial trees and hash tables. In <strong>AgriFlow</strong>, all authoritative records reside in a single flat array <code>Plot plotPool[MAX_PLOTS]</code>.
            </p>
            <ul style={{ fontSize: '0.82rem', color: '#445652', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Zero Duplication:</strong> The Quad-Tree and Hash Map store only integer indices (<code>int plotIndex</code>).</li>
              <li><strong>Immediate Visibility:</strong> When an O(1) sensor update modifies <code>plotPool[idx].soilMoisture</code>, that change is immediately visible to spatial range queries and min-heap scheduler runs without tree re-indexing.</li>
              <li><strong>Safe Pointers:</strong> Eliminates dangling C pointer hazards across network requests.</li>
            </ul>
          </div>

          <div style={{ backgroundColor: 'var(--color-forest-dark)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-forest-border)', color: 'var(--color-ivory)', fontFamily: 'monospace', fontSize: '0.74rem', lineHeight: 1.4 }}>
            <div style={{ color: 'var(--color-gold)', fontWeight: 700, marginBottom: '6px' }}>// Shared Memory Architecture</div>
            <div>plotPool[MAX_PLOTS] &larr; Single Source of Truth</div>
            <div style={{ color: 'rgba(227, 218, 201, 0.4)' }}>&nbsp;&nbsp;&uarr;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&uarr;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&uarr;</div>
            <div style={{ color: 'rgba(227, 218, 201, 0.4)' }}>&nbsp;&nbsp;| (plotIdx)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;| (plotIdx)&nbsp;&nbsp;&nbsp;&nbsp;| (plotIdx)</div>
            <div>[Quad-Tree]&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Hash Map]&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Min-Heap]</div>
            <div style={{ color: 'rgba(227, 218, 201, 0.6)', marginTop: '4px' }}>Spatial 2D Index&nbsp;&nbsp;&nbsp;ID Lookup Index Priority Queue</div>
          </div>
        </div>
      </div>

      {/* 3 Core Data Structures Detailed Breakdown */}
      <div className="grid-3">
        {/* Quad-Tree Card */}
        <div className="card">
          <div className="card-title">
            <span>2. Quad-Tree (Spatial Index)</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#687975', marginBottom: '12px' }}>
            2D Geographic Bounding Box Range Query
          </div>

          <div style={{ fontSize: '0.82rem', color: '#334D46', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p>
              <strong>Why it is used:</strong> Farmland density is highly non-uniform. Linear scans ($O(n)$) across 25,000 plots cause prohibitive lag.
            </p>
            <p>
              <strong>Subdivision:</strong> Nodes split into 4 quadrants (NW, NE, SW, SE) when plot count exceeds <code>MAX_PLOTS_PER_NODE = 4</code>.
            </p>
            <p>
              <strong>Subtree Pruning:</strong> If <code>!rectIntersects(node-&gt;boundary, queryZone)</code>, the entire quadrant subtree is discarded in $O(1)$ time.
            </p>
            <div style={{ backgroundColor: 'var(--color-ivory-surface)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '0.76rem', marginTop: '4px' }}>
              <div><strong>Core C Functions:</strong></div>
              <div><code>createQuadNode()</code>, <code>subdivide()</code></div>
              <div><code>insertPlot()</code>, <code>rangeQuery()</code></div>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-forest)', fontWeight: 600, marginTop: '4px' }}>
              Complexity: Avg $O(\log n + k)$ | Worst $O(n)$
            </div>
          </div>
        </div>

        {/* Hash Map Card */}
        <div className="card">
          <div className="card-title">
            <span>3. Hash Map (ID Lookup)</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#687975', marginBottom: '12px' }}>
            Multiplicative Fibonacci Hash + Separate Chaining
          </div>

          <div style={{ fontSize: '0.82rem', color: '#334D46', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p>
              <strong>Why it is used:</strong> Infield sensors continuously push telemetry tagged with integer <code>plotId</code>. Array scanning requires $O(n)$ time per reading.
            </p>
            <p>
              <strong>Fibonacci Hash Formula:</strong>
              <br />
              <code style={{ fontSize: '0.72rem' }}>((plotId &times; 2654435761u) % 4099)</code>
            </p>
            <p>
              <strong>Separate Chaining:</strong> Buckets use singly linked <code>HashNode</code> lists to handle collisions and reject duplicate plot IDs.
            </p>
            <div style={{ backgroundColor: 'var(--color-ivory-surface)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '0.76rem', marginTop: '4px' }}>
              <div><strong>Core C Functions:</strong></div>
              <div><code>hashPlotId()</code>, <code>insertPlotId()</code></div>
              <div><code>lookupPlotIndex()</code>, <code>applySensorReading()</code></div>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-forest)', fontWeight: 600, marginTop: '4px' }}>
              Complexity: Avg $O(1)$ | Worst $O(n)$
            </div>
          </div>
        </div>

        {/* Binary Min-Heap Card */}
        <div className="card">
          <div className="card-title">
            <span>4. Binary Min-Heap (Scheduler)</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#687975', marginBottom: '12px' }}>
            Urgency-Based Irrigation Priority Queue
          </div>

          <div style={{ fontSize: '0.82rem', color: '#334D46', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p>
              <strong>Urgency Score Formula:</strong>
              <br />
              <code style={{ fontSize: '0.72rem' }}>moisture + (rain*0.5) - (overdue*2.0)</code>
              <br />
              <span style={{ fontSize: '0.75rem', color: '#687975' }}>Lower score = higher irrigation urgency!</span>
            </p>
            <p>
              <strong>Heap Operations:</strong> Matched in-zone plots are pushed with <code>push()</code> in $O(\log k)$. Highest-priority plots are extracted with <code>extractMin()</code> in $O(\log k)$.
            </p>
            <p>
              <strong>Water Budgeting:</strong> Greedy dispatch allocates 10.0 units per plot and terminates when budget is exhausted.
            </p>
            <div style={{ backgroundColor: 'var(--color-ivory-surface)', padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '0.76rem', marginTop: '4px' }}>
              <div><strong>Core C Functions:</strong></div>
              <div><code>createMinHeap()</code>, <code>push()</code></div>
              <div><code>extractMin()</code>, <code>computeUrgency()</code></div>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-forest)', fontWeight: 600, marginTop: '4px' }}>
              Complexity: $O(k \log k)$ build &amp; extract | Space $O(k)$
            </div>
          </div>
        </div>
      </div>

      {/* Asymptotic Complexity & Trade-Off Matrix */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '8px' }}>
          <span>Academic Trade-Off Matrix (Design Document Section 4)</span>
        </h3>
        <p className="card-subtitle">
          Comparative evaluation of chosen data structures versus standard alternatives.
        </p>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Operation</th>
                <th>Alternative Considered</th>
                <th>Chosen Data Structure</th>
                <th>Asymptotic Advantage</th>
                <th>Academic Justification</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Geographic Zone Query</strong></td>
                <td>Flat Array Linear Scan</td>
                <td><strong>Quad-Tree</strong></td>
                <td><span className="badge badge-gold">O(n) vs O(log n + k)</span></td>
                <td>Linear scan across 25,000 plots for taluka queries is unviable. Quad-Tree dynamically subdivides dense clusters while pruning empty zones.</td>
              </tr>
              <tr>
                <td><strong>Geographic Zone Query</strong></td>
                <td>Uniform Fixed Grid</td>
                <td><strong>Quad-Tree</strong></td>
                <td><span className="badge badge-gold">Fixed cells vs Adaptive</span></td>
                <td>Farmland density is non-uniform; fixed grid cells either overflow into long linked lists or waste memory on empty arid areas.</td>
              </tr>
              <tr>
                <td><strong>Plot ID Lookup</strong></td>
                <td>Linear Scan of Pool</td>
                <td><strong>Hash Map</strong></td>
                <td><span className="badge badge-gold">O(n) vs O(1) avg</span></td>
                <td>Sensor telemetry streams continuously. An O(n) scan per reading causes severe dispatch bottlenecks.</td>
              </tr>
              <tr>
                <td><strong>Plot ID Lookup</strong></td>
                <td>Self-Balancing BST (AVL)</td>
                <td><strong>Hash Map</strong></td>
                <td><span className="badge badge-gold">O(log n) vs O(1) avg</span></td>
                <td>Plot IDs are random integers not requiring ordered traversal; tree balancing overhead is unnecessary.</td>
              </tr>
              <tr>
                <td><strong>Urgency Scheduling</strong></td>
                <td>Full Array Sorting (QuickSort)</td>
                <td><strong>Binary Min-Heap</strong></td>
                <td><span className="badge badge-gold">O(k log k) vs O(m log k)</span></td>
                <td>When water budget only covers m &ll; k plots, Min-Heap extracts exactly m items without sorting all k candidates.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
