// Plot Management Page
import React, { useState } from 'react';
import { api } from '../api';
import { IconPlotManagement, IconPlus, IconSearch, IconTrash, IconAlert, IconCheck, IconRefresh } from '../components/Icons';

export default function PlotManagement({ allPlots = [], onRefreshData, isBusy }) {
  // Add Plot Form State
  const [formPlotId, setFormPlotId] = useState('');
  const [formX, setFormX] = useState('');
  const [formY, setFormY] = useState('');
  const [formMoisture, setFormMoisture] = useState('');
  const [formRain, setFormRain] = useState('0.0');
  const [formDays, setFormDays] = useState('0');

  // Search by ID State
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');

  // Delete State
  const [plotToDelete, setPlotToDelete] = useState(null);

  // Status message
  const [statusMsg, setStatusMsg] = useState(null);

  const handleAddPlot = async (e) => {
    e.preventDefault();
    setStatusMsg(null);

    // Validation
    const pid = parseInt(formPlotId, 10);
    const x = parseFloat(formX);
    const y = parseFloat(formY);
    const m = parseFloat(formMoisture);
    const r = parseFloat(formRain);
    const d = parseInt(formDays, 10);

    if (isNaN(pid) || pid <= 0) {
      setStatusMsg({ type: 'danger', text: 'Plot ID must be a positive integer.' });
      return;
    }
    if (isNaN(x) || x < 0.0 || x > 100.0 || isNaN(y) || y < 0.0 || y > 100.0) {
      setStatusMsg({ type: 'danger', text: 'Coordinates (X, Y) must be between 0.0 and 100.0.' });
      return;
    }
    if (isNaN(m) || m < 0.0 || m > 100.0) {
      setStatusMsg({ type: 'danger', text: 'Soil Moisture must be between 0.0% and 100.0%.' });
      return;
    }
    if (isNaN(r) || r < 0.0 || r > 500.0) {
      setStatusMsg({ type: 'danger', text: 'Rain forecast must be between 0.0 mm and 500.0 mm.' });
      return;
    }
    if (isNaN(d) || d < 0 || d > 365) {
      setStatusMsg({ type: 'danger', text: 'Days since last irrigation must be between 0 and 365.' });
      return;
    }

    try {
      const res = await api.addPlot({
        plotId: pid,
        x,
        y,
        soilMoisture: m,
        rainForecastMM: r,
        daysSinceIrrigation: d,
      });

      setStatusMsg({ type: 'success', text: res.message });
      setFormPlotId('');
      setFormX('');
      setFormY('');
      setFormMoisture('');
      setFormRain('0.0');
      setFormDays('0');
      onRefreshData();
    } catch (err) {
      setStatusMsg({ type: 'danger', text: err.message || 'Failed to add plot.' });
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchError('');
    setSearchResult(null);

    const pid = parseInt(searchId, 10);
    if (isNaN(pid) || pid <= 0) {
      setSearchError('Please enter a valid positive integer Plot ID.');
      return;
    }

    try {
      const res = await api.getPlotById(pid);
      setSearchResult(res.plot);
    } catch (err) {
      setSearchError(err.message || `Plot ID ${pid} not found in Hash Map.`);
    }
  };

  const confirmDelete = async () => {
    if (!plotToDelete) return;
    setStatusMsg(null);
    try {
      const res = await api.deletePlot(plotToDelete.plotId);
      setStatusMsg({ type: 'success', text: res.message });
      setPlotToDelete(null);
      if (searchResult?.plotId === plotToDelete.plotId) {
        setSearchResult(null);
      }
      onRefreshData();
    } catch (err) {
      setStatusMsg({ type: 'danger', text: err.message || 'Failed to delete plot.' });
    }
  };

  return (
    <div className="page-container">
      {statusMsg && (
        <div className={`alert alert-${statusMsg.type}`}>
          {statusMsg.type === 'success' ? <IconCheck size={18} /> : <IconAlert size={18} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Top Grid: Add Plot Form & Search by ID Form */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Add Plot Form */}
        <div className="card">
          <div className="card-title">
            <IconPlus size={18} />
            <span>Add Sugarcane Plot to Pool</span>
          </div>
          <p className="card-subtitle">
            Atomically registers plot in central pool, Quad-Tree spatial index, and Hash Map. Duplicate IDs are rejected.
          </p>

          <form onSubmit={handleAddPlot}>
            <div className="grid-3" style={{ gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Plot ID *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 5001"
                  value={formPlotId}
                  onChange={(e) => setFormPlotId(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">X Coord [0-100] *</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  placeholder="0.0 - 100.0"
                  value={formX}
                  onChange={(e) => setFormX(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Y Coord [0-100] *</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  placeholder="0.0 - 100.0"
                  value={formY}
                  onChange={(e) => setFormY(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-3" style={{ gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Soil Moisture % *</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  placeholder="0.0 - 100.0"
                  value={formMoisture}
                  onChange={(e) => setFormMoisture(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Rain Forecast (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={formRain}
                  onChange={(e) => setFormRain(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Overdue Days</label>
                <input
                  type="number"
                  className="form-input"
                  value={formDays}
                  onChange={(e) => setFormDays(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-gold" style={{ marginTop: '8px' }} disabled={isBusy}>
              <IconPlus size={16} />
              <span>Register Plot</span>
            </button>
          </form>
        </div>

        {/* Search Plot by ID via C Hash Map */}
        <div className="card">
          <div className="card-title">
            <IconSearch size={18} />
            <span>Search Plot by ID (Hash Map O(1))</span>
          </div>
          <p className="card-subtitle">
            Query the C separate-chaining hash table for instant plot index retrieval.
          </p>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <input
              type="number"
              className="form-input"
              style={{ flex: 1 }}
              placeholder="Enter Plot ID (e.g. 1001)"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
            <button type="submit" className="btn btn-forest">
              <IconSearch size={16} />
              <span>Lookup</span>
            </button>
          </form>

          {searchError && (
            <div className="alert alert-danger" style={{ margin: 0 }}>
              <IconAlert size={16} />
              <span>{searchError}</span>
            </div>
          )}

          {searchResult && (
            <div className="card card-forest" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: 700, color: 'var(--color-gold)', fontSize: '1.05rem' }}>
                  Plot #{searchResult.plotId}
                </div>
                <span className="badge badge-gold">Score: {searchResult.urgencyScore.toFixed(2)}</span>
              </div>

              <div className="grid-2" style={{ gap: '8px', fontSize: '0.82rem', color: 'var(--color-ivory)' }}>
                <div>Coordinates: <strong>({searchResult.x.toFixed(1)}, {searchResult.y.toFixed(1)})</strong></div>
                <div>Soil Moisture: <strong>{searchResult.soilMoisture.toFixed(1)}%</strong></div>
                <div>Rain Forecast: <strong>{searchResult.rainForecastMM.toFixed(1)} mm</strong></div>
                <div>Days Overdue: <strong>{searchResult.daysSinceIrrigation} days</strong></div>
                <div>Status: <span className="badge badge-success">Active In Pool</span></div>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setPlotToDelete(searchResult)}
                >
                  <IconTrash size={14} />
                  <span>Delete Plot</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Plots Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>
              <span>Registered Farm Plots ({allPlots.length})</span>
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#556B65' }}>
              Authoritative records in central plotPool array.
            </span>
          </div>

          <button className="btn btn-outline btn-sm" onClick={onRefreshData} disabled={isBusy}>
            <IconRefresh size={14} />
            <span>Refresh</span>
          </button>
        </div>

        {allPlots.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plot ID</th>
                  <th>Coordinates (X, Y)</th>
                  <th>Soil Moisture</th>
                  <th>Rain Forecast (mm)</th>
                  <th>Days Overdue</th>
                  <th>Urgency Score</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allPlots.map((p) => (
                  <tr key={p.plotId}>
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
                      <span className="badge badge-success">Active</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setPlotToDelete(p)}
                        title="Delete plot from system"
                      >
                        <IconTrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#687975', fontSize: '0.88rem' }}>
            No plots found in the database. Use &quot;Load Samples&quot; or the form above to add plots.
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {plotToDelete && (
        <div className="modal-overlay" onClick={() => setPlotToDelete(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h4 className="modal-title" style={{ fontSize: '1.1rem' }}>Confirm Plot Deletion</h4>
            </div>
            <div className="modal-body">
              <p style={{ color: '#334D46', fontSize: '0.9rem', marginBottom: '12px' }}>
                Are you sure you want to delete <strong>Plot #{plotToDelete.plotId}</strong>?
              </p>
              <p style={{ color: '#667875', fontSize: '0.78rem' }}>
                This will invoke <code>markPlotInactive()</code> in the central pool and remove its bucket entry from the C Hash Map. Subsequent spatial range queries and scheduler dispatches will ignore this plot.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setPlotToDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                <IconTrash size={14} />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
