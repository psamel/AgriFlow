// Irrigation Scheduler Page (Binary Min-Heap Priority Queue)
import React, { useState } from 'react';
import { api } from '../api';
import { IconScheduler, IconPlay, IconAlert, IconCheck, IconDroplets } from '../components/Icons';

export default function IrrigationScheduler({ isBusy }) {
  // Target Zone Coordinates
  const [xMin, setXMin] = useState(0.0);
  const [yMin, setYMin] = useState(0.0);
  const [xMax, setXMax] = useState(50.0);
  const [yMax, setYMax] = useState(50.0);

  // Water Budget (liters / units)
  const [waterBudget, setWaterBudget] = useState(50.0);

  // Results
  const [scheduleResult, setScheduleResult] = useState(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerateSchedule = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setScheduleResult(null);

    const x1 = parseFloat(xMin);
    const y1 = parseFloat(yMin);
    const x2 = parseFloat(xMax);
    const y2 = parseFloat(yMax);
    const budget = parseFloat(waterBudget);

    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
      setErrorMsg('Please enter valid numerical zone boundaries.');
      return;
    }
    if (x1 >= x2 || y1 >= y2) {
      setErrorMsg('Zone lower bounds (xMin, yMin) must be strictly less than upper bounds (xMax, yMax).');
      return;
    }
    if (isNaN(budget) || budget < 0.0) {
      setErrorMsg('Water budget must be a non-negative number.');
      return;
    }

    setIsScheduling(true);
    try {
      const res = await api.scheduleIrrigation(x1, y1, x2, y2, budget);
      setScheduleResult(res);
    } catch (err) {
      setErrorMsg(err.message || 'Irrigation schedule generation failed.');
    } finally {
      setIsScheduling(false);
    }
  };

  const summary = scheduleResult?.summary;
  const items = scheduleResult?.items || [];
  const percentUsed = summary && summary.initialBudget > 0
    ? Math.min((summary.waterAllocated / summary.initialBudget) * 100, 100)
    : 0;

  return (
    <div className="page-container">
      {/* Overview notice */}
      <div className="alert alert-info">
        <IconScheduler size={18} />
        <span>
          <strong>Priority Scheduling Engine:</strong> Matches plots inside the rectangular zone via <strong>Quad-Tree</strong>, pushes them into a dynamic <strong>Binary Min-Heap</strong> ordered by <code>urgencyScore</code> (lower is more urgent), and greedily allocates <strong>10.0 units</strong> of water per plot until the budget is exhausted.
        </span>
      </div>

      {errorMsg && (
        <div className="alert alert-danger">
          <IconAlert size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Input Form Card */}
      <div className="card">
        <div className="card-title">
          <IconScheduler size={18} />
          <span>Dispatch Parameters</span>
        </div>
        <p className="card-subtitle">
          Define the target canal command zone and available daily pumping water budget.
        </p>

        <form onSubmit={handleGenerateSchedule}>
          <div className="grid-5" style={{ gap: '12px', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Zone xMin</label>
              <input
                type="number"
                step="0.5"
                className="form-input"
                value={xMin}
                onChange={(e) => setXMin(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Zone yMin</label>
              <input
                type="number"
                step="0.5"
                className="form-input"
                value={yMin}
                onChange={(e) => setYMin(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Zone xMax</label>
              <input
                type="number"
                step="0.5"
                className="form-input"
                value={xMax}
                onChange={(e) => setXMax(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Zone yMax</label>
              <input
                type="number"
                step="0.5"
                className="form-input"
                value={yMax}
                onChange={(e) => setYMax(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Water Budget (Units)</label>
              <input
                type="number"
                step="5.0"
                min="0.0"
                className="form-input"
                value={waterBudget}
                onChange={(e) => setWaterBudget(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setXMin(0); setYMin(0); setXMax(50); setYMax(50); setWaterBudget(30); }}>
                6-Plot Demo Zone (30u)
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setXMin(0); setYMin(0); setXMax(100); setYMax(100); setWaterBudget(100); }}>
                Full Field (100u)
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => { setXMin(20); setYMin(20); setXMax(70); setYMax(70); setWaterBudget(40); }}>
                Sector B (40u)
              </button>
            </div>

            <button type="submit" className="btn btn-gold" disabled={isScheduling || isBusy}>
              <IconPlay size={16} />
              <span>{isScheduling ? 'Generating via Min-Heap...' : 'Generate Daily Schedule'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Summary Metrics & Progress Bar */}
      {summary && (
        <div className="card card-forest">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              <span>Irrigation Dispatch Summary</span>
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-gold)' }}>
              Fixed Rule: 10.0 units/plot
            </span>
          </div>

          <div className="grid-5" style={{ gap: '14px', marginBottom: '18px' }}>
            <div style={{ backgroundColor: 'var(--color-forest-surface)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.72rem', opacity: 0.8, textTransform: 'uppercase' }}>Eligible In-Zone</span>
              <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', color: 'var(--color-ivory)' }}>
                {summary.totalMatched} plots
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--color-forest-surface)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-gold-border)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-gold)', textTransform: 'uppercase', fontWeight: 600 }}>Plots Served</span>
              <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}>
                {summary.plotsServed} plots
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--color-forest-surface)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.72rem', color: summary.plotsUnserved > 0 ? '#FC8181' : '#68D391', textTransform: 'uppercase', fontWeight: 600 }}>
                Unserved Plots
              </span>
              <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', color: summary.plotsUnserved > 0 ? '#FC8181' : '#68D391' }}>
                {summary.plotsUnserved} plots
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--color-forest-surface)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.72rem', opacity: 0.8, textTransform: 'uppercase' }}>Water Allocated</span>
              <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', color: 'var(--color-ivory)' }}>
                {summary.waterAllocated.toFixed(1)} u
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--color-forest-surface)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.72rem', opacity: 0.8, textTransform: 'uppercase' }}>Remaining Budget</span>
              <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', color: 'var(--color-ivory)' }}>
                {summary.remainingBudget.toFixed(1)} u
              </div>
            </div>
          </div>

          {/* Budget Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '6px', opacity: 0.9 }}>
              <span>Water Budget Utilization</span>
              <span>{summary.waterAllocated.toFixed(1)} / {summary.initialBudget.toFixed(1)} units ({percentUsed.toFixed(0)}%)</span>
            </div>
            <div style={{ height: '8px', backgroundColor: 'var(--color-forest-dark)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${percentUsed}%`,
                  backgroundColor: 'var(--color-gold)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Priority Schedule Results Table */}
      {items.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>
                <span>Min-Heap Priority Dispatch Table</span>
              </h3>
              <p className="card-subtitle" style={{ margin: 0 }}>
                Plots ordered strictly by extractMin() from the C Binary Min-Heap.
              </p>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Priority Rank</th>
                  <th>Plot ID</th>
                  <th>Urgency Score</th>
                  <th>Planar Coords</th>
                  <th>Soil Moisture</th>
                  <th>Rain Forecast</th>
                  <th>Overdue Days</th>
                  <th>Water Allocated</th>
                  <th>Dispatch Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.plotId} className={it.served ? 'highlight' : ''}>
                    <td style={{ fontWeight: 700 }}>
                      <span className="badge badge-gold">Rank #{it.rank}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>#{it.plotId}</td>
                    <td>
                      <strong style={{ color: 'var(--color-forest)' }}>
                        {it.urgencyScore.toFixed(2)}
                      </strong>
                    </td>
                    <td>({it.x.toFixed(1)}, {it.y.toFixed(1)})</td>
                    <td>
                      <span className={`badge ${it.soilMoisture < 25 ? 'badge-urgent' : 'badge-gold'}`}>
                        {it.soilMoisture.toFixed(1)}%
                      </span>
                    </td>
                    <td>{it.rainForecastMM.toFixed(1)} mm</td>
                    <td>{it.daysSinceIrrigation} days</td>
                    <td>{it.waterAllocated.toFixed(1)} units</td>
                    <td>
                      {it.served ? (
                        <span className="badge badge-success">Served (10.0 u)</span>
                      ) : (
                        <span className="badge badge-urgent">Unserved (Budget Exhausted)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
