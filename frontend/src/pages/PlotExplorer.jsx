// Plot Explorer — 2D Spatial Cartesian Grid & C Quad-Tree Range Query
import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { IconMap, IconSearch, IconAlert, IconCheck } from '../components/Icons';

export default function PlotExplorer({ allPlots = [], onRefreshData }) {
  const [xMin, setXMin] = useState(0.0);
  const [yMin, setYMin] = useState(0.0);
  const [xMax, setXMax] = useState(50.0);
  const [yMax, setYMax] = useState(50.0);

  const [selectedPlot, setSelectedPlot] = useState(null);
  const [queryResults, setQueryResults] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Initial range query on mount if plots exist
  useEffect(() => {
    if (allPlots.length > 0 && queryResults === null) {
      handleRunQuery(0.0, 0.0, 50.0, 50.0);
    }
  }, [allPlots]);

  const handleRunQuery = async (xmin = xMin, ymin = yMin, xmax = xMax, ymax = yMax) => {
    setErrorMsg('');
    setIsQuerying(true);
    try {
      const res = await api.spatialQuery(parseFloat(xmin), parseFloat(ymin), parseFloat(xmax), parseFloat(ymax));
      setQueryResults(res);
      if (res.plots.length > 0) {
        setSelectedPlot(res.plots[0]);
      } else {
        setSelectedPlot(null);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Spatial range query failed.');
    } finally {
      setIsQuerying(false);
    }
  };

  const setPreset = (x1, y1, x2, y2) => {
    setXMin(x1);
    setYMin(y1);
    setXMax(x2);
    setYMax(y2);
    handleRunQuery(x1, y1, x2, y2);
  };

  // Helper: map Cartesian coordinate to SVG percentage
  // In Cartesian: (0,0) is bottom-left, (100,100) is top-right
  const toSvgX = (x) => (x / 100.0) * 100;
  const toSvgY = (y) => ((100.0 - y) / 100.0) * 100;

  const getMoistureColor = (m) => {
    if (m < 20) return '#E53E3E'; // Red
    if (m < 40) return '#DD6B20'; // Orange
    if (m < 60) return '#D69E2E'; // Yellow / Amber
    return '#38A169';             // Green
  };

  const matchedSet = new Set((queryResults?.plots || []).map((p) => p.plotId));

  return (
    <div className="page-container">
      {/* Informational banner */}
      <div className="alert alert-info">
        <IconMap size={18} />
        <span>
          <strong>Simulated 100 &times; 100 Unit Sugarcane Plantation:</strong> Geographic range queries are executed on the backend by the C99 <strong>Quad-Tree</strong> index, pruning subtrees that fall outside the query bounding box.
        </span>
      </div>

      {errorMsg && (
        <div className="alert alert-danger">
          <IconAlert size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: 2D Field Map on Left, Query Controls on Right */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left: Interactive 2D Cartesian SVG Map */}
        <div className="card card-forest" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div className="card-title" style={{ fontSize: '1rem', margin: 0 }}>
              <span>Field Planar Grid [0.0 - 100.0]</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-gold)' }}>
              {queryResults ? `${queryResults.matchedCount} Matched by Quad-Tree` : 'All Plots Displayed'}
            </span>
          </div>

          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '100%',
              backgroundColor: 'var(--color-forest-dark)',
              border: '2px solid var(--color-forest-border)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
            }}
          >
            <svg
              viewBox="0 0 100 100"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            >
              {/* Grid Lines */}
              {[20, 40, 60, 80].map((coord) => (
                <React.Fragment key={coord}>
                  <line
                    x1={coord}
                    y1="0"
                    x2={coord}
                    y2="100"
                    stroke="rgba(229, 198, 144, 0.12)"
                    strokeWidth="0.5"
                    strokeDasharray="1,1"
                  />
                  <line
                    x1="0"
                    y1={coord}
                    x2="100"
                    y2={coord}
                    stroke="rgba(229, 198, 144, 0.12)"
                    strokeWidth="0.5"
                    strokeDasharray="1,1"
                  />
                </React.Fragment>
              ))}

              {/* Major Quadrant Dividers at X=50, Y=50 */}
              <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(229, 198, 144, 0.28)" strokeWidth="0.8" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(229, 198, 144, 0.28)" strokeWidth="0.8" />

              {/* Quadrant Labels */}
              <text x="3" y="8" fill="rgba(227, 218, 201, 0.35)" fontSize="3.5" fontWeight="600">NW [0-50, 50-100]</text>
              <text x="53" y="8" fill="rgba(227, 218, 201, 0.35)" fontSize="3.5" fontWeight="600">NE [50-100, 50-100]</text>
              <text x="3" y="96" fill="rgba(227, 218, 201, 0.35)" fontSize="3.5" fontWeight="600">SW [0-50, 0-50]</text>
              <text x="53" y="96" fill="rgba(227, 218, 201, 0.35)" fontSize="3.5" fontWeight="600">SE [50-100, 0-50]</text>

              {/* Query Zone Rectangular Overlay */}
              {queryResults && (
                <rect
                  x={Math.min(xMin, xMax)}
                  y={100 - Math.max(yMin, yMax)}
                  width={Math.abs(xMax - xMin)}
                  height={Math.abs(yMax - yMin)}
                  fill="rgba(229, 198, 144, 0.18)"
                  stroke="var(--color-gold)"
                  strokeWidth="0.9"
                  strokeDasharray="2,1"
                />
              )}

              {/* Plot Markers */}
              {allPlots.map((p) => {
                const sx = toSvgX(p.x);
                const sy = toSvgY(p.y);
                const isMatched = matchedSet.has(p.plotId);
                const isSelected = selectedPlot?.plotId === p.plotId;
                const markerColor = getMoistureColor(p.soilMoisture);

                return (
                  <g
                    key={p.plotId}
                    onClick={() => setSelectedPlot(p)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Highlight halo if matched or selected */}
                    {isSelected && (
                      <circle cx={sx} cy={sy} r="4.2" fill="none" stroke="var(--color-gold)" strokeWidth="1.2" />
                    )}
                    {isMatched && !isSelected && (
                      <circle cx={sx} cy={sy} r="3.2" fill="none" stroke="rgba(229, 198, 144, 0.7)" strokeWidth="0.7" />
                    )}

                    {/* Main Plot Dot */}
                    <circle
                      cx={sx}
                      cy={sy}
                      r={isSelected ? "2.6" : isMatched ? "2.2" : "1.6"}
                      fill={markerColor}
                      stroke={isMatched ? "#FFF" : "rgba(0,0,0,0.5)"}
                      strokeWidth="0.4"
                      opacity={isMatched || !queryResults ? 1.0 : 0.45}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Map Legend */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.72rem', color: 'var(--color-ivory)', opacity: 0.9 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E53E3E' }}></span>
              &lt;20% Stress
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DD6B20' }}></span>
              20-40% Low
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D69E2E' }}></span>
              40-60% Moderate
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#38A169' }}></span>
              &gt;60% Adequate
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '8px', border: '1px dashed var(--color-gold)', backgroundColor: 'rgba(229, 198, 144, 0.2)' }}></span>
              Query Zone
            </span>
          </div>
        </div>

        {/* Right: Zone Inputs & Selected Plot Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Query Coordinates Input Panel */}
          <div className="card">
            <div className="card-title">
              <IconSearch size={18} />
              <span>C Quad-Tree Rectangular Query</span>
            </div>
            <p className="card-subtitle">
              Specify bounding rectangle [xMin, yMin] &times; [xMax, yMax] on [0.0, 100.0].
            </p>

            <div className="grid-2" style={{ gap: '12px', marginBottom: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">xMin (0.0 - 100.0)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  value={xMin}
                  onChange={(e) => setXMin(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">yMin (0.0 - 100.0)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  value={yMin}
                  onChange={(e) => setYMin(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">xMax (0.0 - 100.0)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  value={xMax}
                  onChange={(e) => setXMax(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">yMax (0.0 - 100.0)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  value={yMax}
                  onChange={(e) => setYMax(e.target.value)}
                />
              </div>
            </div>

            {/* Zone Presets */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setPreset(0, 0, 50, 50)}>
                SW Zone [0,0]-[50,50]
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setPreset(50, 0, 100, 50)}>
                SE Zone [50,0]-[100,50]
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setPreset(20, 20, 80, 80)}>
                Central Command [20,20]-[80,80]
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setPreset(0, 0, 100, 100)}>
                Full Field [0,0]-[100,100]
              </button>
            </div>

            <button
              className="btn btn-gold"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => handleRunQuery()}
              disabled={isQuerying}
            >
              <IconSearch size={16} />
              <span>{isQuerying ? 'Executing C Range Query...' : 'Run Quad-Tree Range Query'}</span>
            </button>
          </div>

          {/* Selected Plot Detail Card */}
          {selectedPlot ? (
            <div className="card" style={{ borderLeft: '4px solid var(--color-forest)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div className="card-title" style={{ margin: 0 }}>
                  <span>Plot #{selectedPlot.plotId} Inspection</span>
                </div>
                <span className={`badge ${selectedPlot.soilMoisture < 25 ? 'badge-urgent' : 'badge-gold'}`}>
                  Score: {selectedPlot.urgencyScore.toFixed(2)}
                </span>
              </div>
              <p className="card-subtitle" style={{ marginBottom: '12px' }}>
                Retrieved directly from shared plot pool index.
              </p>

              <div className="grid-2" style={{ gap: '10px', fontSize: '0.84rem' }}>
                <div>Location: <strong>({selectedPlot.x.toFixed(1)}, {selectedPlot.y.toFixed(1)})</strong></div>
                <div>Soil Moisture: <strong>{selectedPlot.soilMoisture.toFixed(1)}%</strong></div>
                <div>Rain Forecast: <strong>{selectedPlot.rainForecastMM.toFixed(1)} mm</strong></div>
                <div>Overdue Days: <strong>{selectedPlot.daysSinceIrrigation} days</strong></div>
                <div>Status: <span className="badge badge-success">Active Plot</span></div>
                <div>In Query Zone: <strong>{matchedSet.has(selectedPlot.plotId) ? 'Yes' : 'No'}</strong></div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '24px', color: '#72837F', fontSize: '0.85rem' }}>
              Click any plot on the field map to inspect its real-time telemetry.
            </div>
          )}
        </div>
      </div>

      {/* Query Results Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>
              <span>Quad-Tree Matched Plots</span>
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#556B65' }}>
              {queryResults
                ? `${queryResults.matchedCount} plots found within zone [${xMin}, ${yMin}] to [${xMax}, ${yMax}]`
                : 'Run a query to view results'}
            </span>
          </div>
        </div>

        {queryResults && queryResults.plots.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plot ID</th>
                  <th>Planar Coordinates (X, Y)</th>
                  <th>Soil Moisture</th>
                  <th>Rain Forecast (mm)</th>
                  <th>Days Overdue</th>
                  <th>Calculated Urgency Score</th>
                  <th>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {queryResults.plots.map((p) => (
                  <tr
                    key={p.plotId}
                    className={selectedPlot?.plotId === p.plotId ? 'highlight' : ''}
                    onClick={() => setSelectedPlot(p)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 700 }}>#{p.plotId}</td>
                    <td>({p.x.toFixed(2)}, {p.y.toFixed(2)})</td>
                    <td>
                      <span className={`badge ${p.soilMoisture < 25 ? 'badge-urgent' : 'badge-gold'}`}>
                        {p.soilMoisture.toFixed(1)}%
                      </span>
                    </td>
                    <td>{p.rainForecastMM.toFixed(1)} mm</td>
                    <td>{p.daysSinceIrrigation} days</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-forest)' }}>
                      {p.urgencyScore.toFixed(2)}
                    </td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => setSelectedPlot(p)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : queryResults && queryResults.plots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#687975', fontSize: '0.88rem' }}>
            No sugarcane plots fall within the specified zone coordinates.
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px', color: '#72837F', fontSize: '0.88rem' }}>
            Click &quot;Run Quad-Tree Range Query&quot; above to fetch plots inside the selected zone.
          </div>
        )}
      </div>
    </div>
  );
}
