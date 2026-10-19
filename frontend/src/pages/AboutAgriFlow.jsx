// About AgriFlow Academic Context Page
import React from 'react';
import { IconAbout, IconCheck } from '../components/Icons';

export default function AboutAgriFlow() {
  return (
    <div className="page-container">
      {/* Formal Header Card */}
      <div className="card card-forest">
        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--color-gold)', fontWeight: 600 }}>
          Academic Deliverable &bull; Semester III CSBS
        </span>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', color: 'var(--color-gold)', margin: '6px 0 10px 0' }}>
          AgriFlow — Geofenced Plot Lookup and Irrigation Priority Scheduler
        </h2>
        <p style={{ color: 'var(--color-ivory)', opacity: 0.9, fontSize: '0.88rem', lineHeight: 1.6, maxWidth: '850px' }}>
          A full-stack agricultural decision support platform backed by an ISO C99 algorithmic engine. Developed for Data Structures IA-2 under the Computer Science &amp; Business Systems (CSBS) curriculum at K J Somaiya College of Engineering.
        </p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Academic & Industrial Context */}
        <div className="card">
          <div className="card-title">
            <span>Academic &amp; Industrial Context</span>
          </div>

          <div style={{ fontSize: '0.84rem', color: '#334D46', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <strong>Course Alignment:</strong> Data Structures (Course Code: 316U40C302 / 316U50C302), Semester III, Computer Science and Business Systems (CSBS).
            </div>
            <div>
              <strong>Assessment:</strong> Internal Assessment 2 (IA-2).
            </div>
            <div>
              <strong>Industrial Case Study:</strong> <strong>KJS-AGR-01</strong> — Irrigation Advisory System for Sugarcane Crop, in collaboration with K J Somaiya Applied Agricultural Research (KIAAR) and Godavari Biorefineries Ltd. (GBL), Sameerwadi, Bilagi, and Mudhol talukas in Northern Karnataka.
            </div>
            <div>
              <strong>The Sugarcane Challenge:</strong> Sugarcane requires 1,500 to 2,500 mm of water throughout its 12-month cycle. Farmers face acute water scarcity and intermittent rural 3-phase grid power (restricted to 6–7 hours daily). AgriFlow provides algorithmic spatial filtering, instant sensor ingestion, and water-budget priority scheduling.
            </div>
          </div>
        </div>

        {/* Full-Stack Architecture */}
        <div className="card">
          <div className="card-title">
            <span>End-to-End Architecture Flow</span>
          </div>
          <p className="card-subtitle">
            Strict separation of concerns with true C-backed execution.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', backgroundColor: 'var(--color-ivory-surface)', borderRadius: 'var(--radius-sm)' }}>
              <span className="badge badge-forest">Frontend</span>
              <span><strong>React 19 + Vite:</strong> Responsive desktop-first dashboard with interactive 2D Cartesian grid map.</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', backgroundColor: 'var(--color-ivory-surface)', borderRadius: 'var(--radius-sm)' }}>
              <span className="badge badge-gold">Backend API</span>
              <span><strong>Python 3 + Flask REST API:</strong> JSON endpoints with server validation, mutex serialization, and error reporting.</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', backgroundColor: 'var(--color-ivory-surface)', borderRadius: 'var(--radius-sm)' }}>
              <span className="badge badge-forest">Bridge</span>
              <span><strong>Python ctypes:</strong> Direct FFI invocation of C functions with safe memory boundaries and pointer isolation.</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', backgroundColor: 'var(--color-ivory-surface)', borderRadius: 'var(--radius-sm)' }}>
              <span className="badge badge-urgent">C Core</span>
              <span><strong>ISO C99 Shared Library (DLL):</strong> Authoritative plotPool[25000], Quad-Tree, Hash Map, and Binary Min-Heap.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Viva Talking Points */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '10px' }}>
          <span>Key Viva Talking Points &amp; Technical Defense</span>
        </h3>
        <p className="card-subtitle">
          Questions an external examiner or professor may ask during project evaluation.
        </p>

        <div className="grid-2" style={{ gap: '16px' }}>
          <div style={{ backgroundColor: 'var(--color-ivory-surface)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontWeight: 700, color: 'var(--color-forest)', marginBottom: '6px' }}>
              Q1: Why not just use SQL or a relational database?
            </div>
            <p style={{ fontSize: '0.8rem', color: '#445652', lineHeight: 1.5 }}>
              AgriFlow models an edge or micro-service architecture for low-latency decision support. Implementing the fundamental data structures from scratch in C99 demonstrates spatial indexing (Quad-Tree pruning), constant-time hash resolution with Fibonacci hashing, and partial greedy heap extraction under memory constraints.
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--color-ivory-surface)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontWeight: 700, color: 'var(--color-forest)', marginBottom: '6px' }}>
              Q2: How do you prevent data desynchronization?
            </div>
            <p style={{ fontSize: '0.8rem', color: '#445652', lineHeight: 1.5 }}>
              Via the <strong>Single Source of Truth</strong> pattern. Plot structs exist only inside <code>plotPool[MAX_PLOTS]</code>. The Quad-Tree and Hash Map store only integer indices (<code>int plotIndex</code>). Modifying soil moisture via Hash Map modifies the record in-place; the Quad-Tree spatial index is never touched, yet queries immediately see the new values.
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--color-ivory-surface)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontWeight: 700, color: 'var(--color-forest)', marginBottom: '6px' }}>
              Q3: What prevents Quad-Tree stack overflow on identical coordinates?
            </div>
            <p style={{ fontSize: '0.8rem', color: '#445652', lineHeight: 1.5 }}>
              A hard guard <code>MAX_DEPTH = 20</code>. When points share identical coordinates, normal subdivision would recurse infinitely. AgriFlow ceases subdivision at depth 20 and stores overflow indices in a dynamically resized leaf buffer.
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--color-ivory-surface)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontWeight: 700, color: 'var(--color-forest)', marginBottom: '6px' }}>
              Q4: Why Min-Heap instead of sorting the matched array?
            </div>
            <p style={{ fontSize: '0.8rem', color: '#445652', lineHeight: 1.5 }}>
              When a water budget only covers $m$ plots out of $k$ matched plots ($m \ll k$), a full sort requires $O(k \log k)$ operations. A Min-Heap extracts exactly the top $m$ elements in $O(m \log k)$ time, discarding the remainder without unnecessary sorting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
