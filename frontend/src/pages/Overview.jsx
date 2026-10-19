// Overview Dashboard Page
import React from 'react';
import MoistureHistogram from '../components/MoistureHistogram';
import { IconMap, IconScheduler, IconPlay, IconDroplets, IconAlert, IconPlus } from '../components/Icons';

export default function Overview({ overviewData, onNavigate, onSeedData, onOpenWalkthrough, isBusy }) {
  if (!overviewData || !overviewData.stats) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ color: '#556B65', marginBottom: '16px' }}>Loading system telemetry from C engine...</p>
        </div>
      </div>
    );
  }

  const { stats, moistureDistribution, topPriorityPlots, recentActivity, defaultWaterBudget } = overviewData;
  const activePlots = stats.plots.active;

  if (activePlots === 0) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: 'var(--color-gold-light)', color: '#8C6721', marginBottom: '16px' }}>
            <IconAlert size={32} />
          </div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--color-forest)', marginBottom: '8px' }}>
            No Active Farm Plots in Pool
          </h3>
          <p style={{ maxWidth: '480px', margin: '0 auto 24px auto', color: '#556B65', fontSize: '0.88rem' }}>
            The central sugarcane plot pool is currently empty. You can generate synthetic farm plots across the 100&times;100 field or run the documented walkthrough demo.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
            <button className="btn btn-gold" onClick={() => onSeedData(35, 42)} disabled={isBusy}>
              <IconPlus size={16} />
              <span>Generate 35 Sample Plots</span>
            </button>
            <button className="btn btn-forest" onClick={onOpenWalkthrough} disabled={isBusy}>
              <IconPlay size={16} />
              <span>Launch 6-Plot Walkthrough</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* 5 Key Metric Cards */}
      <div className="grid-5">
        <div className="stat-card">
          <span className="stat-label">Total Allocated</span>
          <span className="stat-value">{stats.plots.total}</span>
          <span className="stat-desc">Plot Pool capacity: 25,000</span>
        </div>

        <div className="stat-card gold">
          <span className="stat-label">Active Plots</span>
          <span className="stat-value">{stats.plots.active}</span>
          <span className="stat-desc">Indexed in QuadTree &amp; Map</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Average Moisture</span>
          <span className="stat-value">{stats.plots.avgMoisture}%</span>
          <span className="stat-desc">Across all active sugarcane plots</span>
        </div>

        <div className="stat-card urgent">
          <span className="stat-label">Urgent Attention</span>
          <span className="stat-value">{stats.plots.needsAttention}</span>
          <span className="stat-desc">Moisture &lt; 30% or score &lt; 25.0</span>
        </div>

        <div className="stat-card gold">
          <span className="stat-label">Water Budget</span>
          <span className="stat-value">{defaultWaterBudget} u</span>
          <span className="stat-desc">Standard allocation (10 u/plot)</span>
        </div>
      </div>

      {/* Main Row: Moisture Distribution Chart & Priority Queue Top Plots */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title">
            <IconDroplets size={18} />
            <span>Soil Moisture Distribution</span>
          </div>
          <p className="card-subtitle">
            Histogram of volumetric soil moisture across active sugarcane fields.
          </p>
          <MoistureHistogram distribution={moistureDistribution} />
        </div>

        <div className="card">
          <div className="card-title" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconScheduler size={18} />
              <span>Highest Priority Plots (Min-Heap Head)</span>
            </span>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigate('scheduler')}>
              Open Scheduler
            </button>
          </div>
          <p className="card-subtitle">
            Plots with lowest urgency scores requiring immediate watering.
          </p>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Plot ID</th>
                  <th>Coords</th>
                  <th>Moisture</th>
                  <th>Rain</th>
                  <th>Urgency</th>
                </tr>
              </thead>
              <tbody>
                {topPriorityPlots.map((p, idx) => (
                  <tr key={p.plotId}>
                    <td style={{ fontWeight: 700 }}>#{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>#{p.plotId}</td>
                    <td>({p.x.toFixed(1)}, {p.y.toFixed(1)})</td>
                    <td>
                      <span className={`badge ${p.soilMoisture < 25 ? 'badge-urgent' : 'badge-gold'}`}>
                        {p.soilMoisture}%
                      </span>
                    </td>
                    <td>{p.rainForecastMM} mm</td>
                    <td>
                      <strong style={{ color: 'var(--color-forest)' }}>{p.urgencyScore.toFixed(2)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Activity & Quick Navigation */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title">
            <span>Recent Application Telemetry</span>
          </div>
          <p className="card-subtitle">
            Live action log recorded across API operations and C data structures.
          </p>

          {recentActivity && recentActivity.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentActivity.map((act) => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-ivory-surface)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--color-forest)', minWidth: '60px' }}>
                    {act.timestamp}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-forest)' }}>{act.action}</div>
                    <div style={{ color: '#556B65', fontSize: '0.74rem' }}>{act.details}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#72837F', fontSize: '0.85rem' }}>No recent activity logged yet.</div>
          )}
        </div>

        <div className="card card-forest">
          <div className="card-title">
            <span>Quick Action Workflows</span>
          </div>
          <p className="card-subtitle">
            Directly test the three core data structures via dedicated modules.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: 'var(--color-forest-surface)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-forest-border)',
                cursor: 'pointer',
              }}
              onClick={() => onNavigate('explorer')}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-gold)' }}>1. Spatial Range Query (Quad-Tree)</div>
                <div style={{ fontSize: '0.74rem', opacity: 0.85 }}>Filter 2D rectangular canal command zones with O(log n + k) pruning.</div>
              </div>
              <IconMap size={18} />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: 'var(--color-forest-surface)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-forest-border)',
                cursor: 'pointer',
              }}
              onClick={() => onNavigate('sensors')}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-gold)' }}>2. Live Sensor Telemetry (Hash Map)</div>
                <div style={{ fontSize: '0.74rem', opacity: 0.85 }}>Update soil moisture in O(1) time without rebuilding spatial trees.</div>
              </div>
              <IconDroplets size={18} />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: 'var(--color-forest-surface)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-forest-border)',
                cursor: 'pointer',
              }}
              onClick={() => onNavigate('scheduler')}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-gold)' }}>3. Water Budget Scheduler (Min-Heap)</div>
                <div style={{ fontSize: '0.74rem', opacity: 0.85 }}>Greedy priority dispatch serving most critical plots first.</div>
              </div>
              <IconScheduler size={18} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
