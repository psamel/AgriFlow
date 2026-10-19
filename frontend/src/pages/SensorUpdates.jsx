// Sensor Updates Page (Simulated Telemetry Ingestion)
import React, { useState } from 'react';
import { api } from '../api';
import { IconDroplets, IconSearch, IconCheck, IconAlert, IconArrowRight } from '../components/Icons';

export default function SensorUpdates({ onRefreshData, isBusy }) {
  const [lookupId, setLookupId] = useState('');
  const [currentPlot, setCurrentPlot] = useState(null);
  const [lookupError, setLookupError] = useState('');

  // Update inputs
  const [newMoisture, setNewMoisture] = useState('');
  const [newRain, setNewRain] = useState('');
  const [updateResult, setUpdateResult] = useState(null);
  const [updateError, setUpdateError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    setLookupError('');
    setCurrentPlot(null);
    setUpdateResult(null);

    const pid = parseInt(lookupId, 10);
    if (isNaN(pid) || pid <= 0) {
      setLookupError('Please enter a valid positive integer Plot ID.');
      return;
    }

    try {
      const res = await api.getPlotById(pid);
      setCurrentPlot(res.plot);
      setNewMoisture(res.plot.soilMoisture.toString());
      setNewRain(res.plot.rainForecastMM.toString());
    } catch (err) {
      setLookupError(err.message || `Plot ID ${pid} not found in C Hash Map.`);
    }
  };

  const handleApplyUpdate = async (e) => {
    e.preventDefault();
    if (!currentPlot) return;
    setUpdateError('');
    setUpdateResult(null);

    const m = parseFloat(newMoisture);
    const r = parseFloat(newRain);

    if (isNaN(m) || m < 0.0 || m > 100.0) {
      setUpdateError('Soil moisture must be between 0.0% and 100.0%.');
      return;
    }
    if (isNaN(r) || r < 0.0 || r > 500.0) {
      setUpdateError('Rain forecast must be between 0.0 mm and 500.0 mm.');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await api.updateSensor(currentPlot.plotId, m, r);
      setUpdateResult(res);
      setCurrentPlot(res.plot);
      onRefreshData();
    } catch (err) {
      setUpdateError(err.message || 'Failed to apply sensor telemetry.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="page-container">
      {/* Educational notice */}
      <div className="alert alert-info">
        <IconDroplets size={18} />
        <span>
          <strong>Simulated Sensor Ingestion:</strong> Infield probes submit telemetry tagged with <code>plotId</code>. The C engine executes <code>applySensorReading(&amp;map, plotId, moisture, rain)</code> which modifies the shared plot pool in <strong>O(1) average time</strong> via separate-chaining hash lookup. The spatial Quad-Tree is not touched.
        </span>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Step 1: Lookup Plot */}
        <div className="card">
          <div className="card-title">
            <IconSearch size={18} />
            <span>Step 1: Fetch Plot via C Hash Map</span>
          </div>
          <p className="card-subtitle">
            Enter the target sugarcane plot ID to retrieve its live pool record.
          </p>

          <form onSubmit={handleLookup} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <input
              type="number"
              className="form-input"
              style={{ flex: 1 }}
              placeholder="Enter Plot ID (e.g. 1001, 1042)"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
            />
            <button type="submit" className="btn btn-forest" disabled={isBusy}>
              <IconSearch size={16} />
              <span>Retrieve</span>
            </button>
          </form>

          {lookupError && (
            <div className="alert alert-danger" style={{ margin: 0 }}>
              <IconAlert size={16} />
              <span>{lookupError}</span>
            </div>
          )}

          {currentPlot && (
            <div className="card" style={{ backgroundColor: 'var(--color-ivory-surface)', marginTop: '16px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-forest)', fontSize: '0.95rem' }}>
                  Current Telemetry for Plot #{currentPlot.plotId}
                </span>
                <span className="badge badge-gold">Current Urgency: {currentPlot.urgencyScore.toFixed(2)}</span>
              </div>

              <div className="grid-2" style={{ gap: '6px', fontSize: '0.8rem', color: '#445652' }}>
                <div>Planar Coordinates: <strong>({currentPlot.x.toFixed(1)}, {currentPlot.y.toFixed(1)})</strong></div>
                <div>Soil Moisture: <strong>{currentPlot.soilMoisture.toFixed(1)}%</strong></div>
                <div>Rainfall Forecast: <strong>{currentPlot.rainForecastMM.toFixed(1)} mm</strong></div>
                <div>Days Overdue: <strong>{currentPlot.daysSinceIrrigation} days</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Apply Sensor Reading */}
        <div className="card">
          <div className="card-title">
            <IconDroplets size={18} />
            <span>Step 2: Submit Simulated Probe Telemetry</span>
          </div>
          <p className="card-subtitle">
            Submit new soil moisture and precipitation forecast values to recalculate urgency.
          </p>

          <form onSubmit={handleApplyUpdate}>
            <div className="form-group">
              <label className="form-label">New Volumetric Soil Moisture % [0.0 - 100.0] *</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                disabled={!currentPlot}
                placeholder="e.g. 15.0"
                value={newMoisture}
                onChange={(e) => setNewMoisture(e.target.value)}
                required
              />
              <span className="form-hint">Simulates drying soil under high evaporative demand.</span>
            </div>

            <div className="form-group">
              <label className="form-label">New 24-48h Rainfall Forecast mm [0.0 - 500.0] *</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                disabled={!currentPlot}
                placeholder="e.g. 0.0"
                value={newRain}
                onChange={(e) => setNewRain(e.target.value)}
                required
              />
              <span className="form-hint">Upcoming rain delays irrigation by increasing the score.</span>
            </div>

            {updateError && (
              <div className="alert alert-danger">
                <IconAlert size={16} />
                <span>{updateError}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-gold"
              style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
              disabled={!currentPlot || isUpdating}
            >
              <IconCheck size={16} />
              <span>{isUpdating ? 'Applying to C Plot Pool...' : 'Apply Sensor Update O(1)'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Update Result Card */}
      {updateResult && (
        <div className="card card-forest">
          <div className="card-title">
            <IconCheck size={20} />
            <span>Sensor Update Successfully Applied to C Engine</span>
          </div>
          <p className="card-subtitle">
            Modified record at shared plotPool index. Recalculated urgency score:
          </p>

          <div className="grid-3" style={{ gap: '16px', margin: '14px 0' }}>
            <div style={{ backgroundColor: 'var(--color-forest-surface)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.74rem', opacity: 0.8, textTransform: 'uppercase' }}>Old Urgency Score</span>
              <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-heading)', color: 'var(--color-ivory)' }}>
                {updateResult.oldUrgencyScore.toFixed(2)}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--color-forest-surface)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-gold-border)' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-gold)', textTransform: 'uppercase', fontWeight: 700 }}>New Urgency Score</span>
              <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}>
                {updateResult.newUrgencyScore.toFixed(2)}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--color-forest-surface)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.74rem', opacity: 0.8, textTransform: 'uppercase' }}>Priority Shift Effect</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 600, color: updateResult.newUrgencyScore < updateResult.oldUrgencyScore ? '#F6AD55' : '#68D391', marginTop: '4px' }}>
                {updateResult.newUrgencyScore < updateResult.oldUrgencyScore
                  ? 'More Urgent (Lower score)'
                  : 'Less Urgent (Higher score)'}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--color-ivory)', opacity: 0.85 }}>
            Subsequent range queries and irrigation schedules will immediately reflect this updated score without requiring tree rebalancing.
          </div>
        </div>
      )}
    </div>
  );
}
