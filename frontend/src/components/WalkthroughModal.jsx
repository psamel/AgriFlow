// Walkthrough Demo Modal (Academic 6-Plot Experiment)
import React, { useState } from 'react';
import { IconClose, IconPlay, IconCheck, IconArrowRight, IconDroplets, IconRefresh } from './Icons';

export default function WalkthroughModal({ isOpen, onClose, onRunWalkthrough, walkthroughData, isBusy }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    { id: 0, title: 'Overview & Testbed Setup' },
    { id: 1, title: 'Step 1: Initial Schedule' },
    { id: 2, title: 'Step 2: Live Sensor Update' },
    { id: 3, title: 'Step 3: Regenerated Schedule' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px' }}>
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>
              Academic Experiment • KJS-AGR-01
            </div>
            <h3 className="modal-title">Documented 6-Plot Walkthrough</h3>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose} style={{ color: 'var(--color-gold)', borderColor: 'var(--color-gold-border)' }}>
            <IconClose size={16} />
          </button>
        </div>

        {/* Step Navigation Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-ivory-border)', backgroundColor: 'var(--color-ivory-surface)' }}>
          {steps.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(idx)}
              style={{
                flex: 1,
                padding: '12px 10px',
                border: 'none',
                background: currentStep === idx ? 'var(--color-ivory-light)' : 'transparent',
                borderBottom: currentStep === idx ? '2px solid var(--color-forest)' : '2px solid transparent',
                color: currentStep === idx ? 'var(--color-forest)' : '#6C7E7A',
                fontWeight: currentStep === idx ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {s.title}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {!walkthroughData ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ marginBottom: '16px', color: '#556B65' }}>
                Click below to execute the 6-plot walkthrough through the C99 shared library engine.
              </p>
              <button className="btn btn-gold" onClick={onRunWalkthrough} disabled={isBusy}>
                <IconPlay size={16} />
                <span>Execute Experiment on C Engine</span>
              </button>
            </div>
          ) : (
            <>
              {/* Step 0: Overview */}
              {currentStep === 0 && (
                <div>
                  <div className="alert alert-info" style={{ marginBottom: '18px' }}>
                    <span>
                      <strong>Design Document Reference: Section 5</strong> — Demonstrates spatial pruning via Quad-Tree, constant-time sensor update via Hash Map, and dynamic priority re-ordering via Min-Heap.
                    </span>
                  </div>

                  <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-forest)', marginBottom: '10px' }}>
                    Isolated 6-Plot Testbed Configuration:
                  </h4>
                  <div className="table-container" style={{ marginBottom: '18px' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Plot ID</th>
                          <th>Label</th>
                          <th>Coordinates</th>
                          <th>Moisture</th>
                          <th>Rain</th>
                          <th>Overdue</th>
                          <th>Geographic Zone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walkthroughData.allPlots.map((p) => {
                          const inZone = p.x <= 50.0 && p.y <= 50.0;
                          return (
                            <tr key={p.plotId} className={inZone ? 'highlight' : ''}>
                              <td style={{ fontWeight: 700 }}>#{p.plotId}</td>
                              <td>{p.plotId === 1001 ? 'P1' : p.plotId === 1042 ? 'P2' : p.plotId === 1003 ? 'P3' : p.plotId === 1004 ? 'P4' : p.plotId === 1005 ? 'P5' : 'P6'}</td>
                              <td>({p.x.toFixed(1)}, {p.y.toFixed(1)})</td>
                              <td>{p.soilMoisture}%</td>
                              <td>{p.rainForecastMM} mm</td>
                              <td>{p.daysSinceIrrigation} days</td>
                              <td>
                                <span className={`badge ${inZone ? 'badge-forest' : 'badge-gold'}`}>
                                  {inZone ? 'Inside [0,0]-[50,50]' : 'Outside Zone'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: '#556B65' }}>
                    Target Zone: <strong>[0.0, 0.0] to [50.0, 50.0]</strong> | Water Budget: <strong>30.0 units</strong> (Water per plot: 10.0 units &rarr; exactly 3 plots served).
                  </p>
                </div>
              )}

              {/* Step 1: Initial Schedule */}
              {currentStep === 1 && (
                <div>
                  <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                    <IconCheck size={16} />
                    <span><strong>Quad-Tree Matched:</strong> 3 in-zone plots (P1, P2, P3). Out-of-zone subtrees pruned!</span>
                  </div>

                  <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-forest)', marginBottom: '8px' }}>
                    Calculated Urgency Scores (Formula: Moisture + Rain*0.5 - Overdue*2):
                  </h4>
                  <ul style={{ fontSize: '0.82rem', color: '#334D46', marginBottom: '16px', paddingLeft: '20px' }}>
                    <li><strong>P1 (#1001):</strong> 18.0 + (0.0 &times; 0.5) - (5 &times; 2.0) = <strong>8.00</strong> (Most Urgent)</li>
                    <li><strong>P3 (#1003):</strong> 25.0 + (0.0 &times; 0.5) - (3 &times; 2.0) = <strong>19.00</strong></li>
                    <li><strong>P2 (#1042):</strong> 42.0 + (0.0 &times; 0.5) - (1 &times; 2.0) = <strong>40.00</strong> (Least Urgent)</li>
                  </ul>

                  <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-forest)', marginBottom: '8px' }}>
                    Initial Min-Heap Extraction Order (Budget = 30.0 units):
                  </h4>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Plot ID</th>
                          <th>Urgency Score</th>
                          <th>Moisture</th>
                          <th>Water Allocated</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walkthroughData.step1.schedule.items.map((it) => (
                          <tr key={it.plotId}>
                            <td><strong>#{it.rank}</strong></td>
                            <td style={{ fontWeight: 600 }}>#{it.plotId}</td>
                            <td><span className="badge badge-gold">{it.urgencyScore.toFixed(2)}</span></td>
                            <td>{it.soilMoisture}%</td>
                            <td>{it.waterAllocated} units</td>
                            <td><span className="badge badge-success">Served</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-forest)' }}>
                    Initial Order: P1 (#1001) &rarr; P3 (#1003) &rarr; P2 (#1042)
                  </div>
                </div>
              )}

              {/* Step 2: Live Sensor Reading */}
              {currentStep === 2 && (
                <div>
                  <div className="alert alert-danger" style={{ marginBottom: '18px' }}>
                    <IconDroplets size={16} />
                    <span><strong>Live Telemetry Ingestion:</strong> Scorching afternoon heat causes P2 soil moisture to plummet!</span>
                  </div>

                  <div className="grid-2" style={{ marginBottom: '20px' }}>
                    <div className="card" style={{ borderLeft: '4px solid #9B2C2C' }}>
                      <div className="card-title" style={{ fontSize: '0.95rem' }}>Before Sensor Update</div>
                      <p style={{ fontSize: '0.8rem', color: '#556B65' }}>Plot ID: #1042 (P2)</p>
                      <div style={{ marginTop: '8px', fontSize: '0.82rem' }}>
                        <div>Soil Moisture: <strong>42.0%</strong></div>
                        <div>Rain Forecast: <strong>0.0 mm</strong></div>
                        <div>Urgency Score: <strong>{walkthroughData.step2.oldScore.toFixed(2)}</strong></div>
                      </div>
                    </div>

                    <div className="card" style={{ borderLeft: '4px solid var(--color-gold)' }}>
                      <div className="card-title" style={{ fontSize: '0.95rem' }}>After O(1) Hash Map Update</div>
                      <p style={{ fontSize: '0.8rem', color: '#556B65' }}>Function: applySensorReading(&map, 1042, 15.0, 0.0)</p>
                      <div style={{ marginTop: '8px', fontSize: '0.82rem' }}>
                        <div>Soil Moisture: <strong>15.0%</strong> (&minus;27.0%)</div>
                        <div>Rain Forecast: <strong>0.0 mm</strong></div>
                        <div>New Urgency Score: <strong>{walkthroughData.step2.newScore.toFixed(2)}</strong></div>
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ backgroundColor: 'var(--color-ivory-surface)' }}>
                    <h5 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-forest)', marginBottom: '4px' }}>
                      Recalculation Breakdown:
                    </h5>
                    <p style={{ fontSize: '0.8rem', color: '#445652' }}>
                      New Urgency = 15.0 + (0.0 &times; 0.5) - (1 &times; 2.0) = <strong>13.00</strong>.
                      Because lower scores indicate higher urgency, P2's urgency has drastically increased from 40.00 down to 13.00!
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Regenerated Schedule */}
              {currentStep === 3 && (
                <div>
                  <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                    <IconCheck size={16} />
                    <span><strong>Priority Re-Ordering:</strong> P2 re-sifted ahead of P3 inside the Min-Heap!</span>
                  </div>

                  <div className="table-container" style={{ marginBottom: '16px' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>New Rank</th>
                          <th>Plot ID</th>
                          <th>Urgency Score</th>
                          <th>Moisture</th>
                          <th>Rank Shift</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walkthroughData.step3.schedule.items.map((it) => (
                          <tr key={it.plotId} className={it.plotId === 1042 ? 'highlight' : ''}>
                            <td><strong>#{it.rank}</strong></td>
                            <td style={{ fontWeight: 600 }}>#{it.plotId}</td>
                            <td><span className="badge badge-gold">{it.urgencyScore.toFixed(2)}</span></td>
                            <td>{it.soilMoisture}%</td>
                            <td>
                              {it.plotId === 1042 ? (
                                <span className="badge badge-urgent" style={{ fontWeight: 700 }}>Jumped #3 &rarr; #2</span>
                              ) : it.plotId === 1003 ? (
                                <span className="badge badge-gold">Moved #2 &rarr; #3</span>
                              ) : (
                                <span className="badge badge-forest">Remained #1</span>
                              )}
                            </td>
                            <td><span className="badge badge-success">Served</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="card card-forest" style={{ padding: '16px 20px' }}>
                    <div style={{ color: 'var(--color-gold)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>
                      Academic Verification Complete:
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-ivory)', opacity: 0.9 }}>
                      Initial Order: <strong>P1 (8.00) &rarr; P3 (19.00) &rarr; P2 (40.00)</strong><br />
                      Regenerated Order: <strong>P1 (8.00) &rarr; P2 (13.00) &rarr; P3 (19.00)</strong>
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          {walkthroughData && (
            <>
              {currentStep > 0 && (
                <button className="btn btn-outline" onClick={() => setCurrentStep(currentStep - 1)}>
                  Previous Step
                </button>
              )}
              {currentStep < 3 ? (
                <button className="btn btn-gold" onClick={() => setCurrentStep(currentStep + 1)}>
                  <span>Next Step</span>
                  <IconArrowRight size={14} />
                </button>
              ) : (
                <button className="btn btn-forest" onClick={onClose}>
                  Done
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
