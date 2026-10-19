// API Client for AgriFlow Backend
const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = data.error || `HTTP ${res.status}: ${res.statusText}`;
      throw new Error(errorMsg);
    }
    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  // Health
  checkHealth: () => request('/health'),

  // Overview
  getOverview: () => request('/overview'),

  // Plots
  getPlots: (limit = 1000) => request(`/plots?limit=${limit}`),
  getPlotById: (plotId) => request(`/plots/${plotId}`),
  addPlot: (plotData) => request('/plots', {
    method: 'POST',
    body: JSON.stringify(plotData),
  }),
  deletePlot: (plotId) => request(`/plots/${plotId}`, {
    method: 'DELETE',
  }),

  // Sensor Readings
  updateSensor: (plotId, soilMoisture, rainForecastMM) => request('/sensor-reading', {
    method: 'POST',
    body: JSON.stringify({ plotId, soilMoisture, rainForecastMM }),
  }),

  // Spatial Range Query (Quad-Tree)
  spatialQuery: (xMin, yMin, xMax, yMax) => request('/spatial-query', {
    method: 'POST',
    body: JSON.stringify({ xMin, yMin, xMax, yMax }),
  }),

  // Irrigation Scheduling (Min-Heap)
  scheduleIrrigation: (xMin, yMin, xMax, yMax, waterBudget) => request('/schedule', {
    method: 'POST',
    body: JSON.stringify({ xMin, yMin, xMax, yMax, waterBudget }),
  }),

  // Telemetry & Statistics
  getStatistics: () => request('/statistics'),

  // System State Management
  resetDataset: () => request('/reset', { method: 'POST' }),
  seedDataset: (count = 35, seed = 42) => request('/seed', {
    method: 'POST',
    body: JSON.stringify({ count, seed }),
  }),

  // Academic Walkthrough Demo
  runWalkthrough: () => request('/walkthrough/run', { method: 'POST' }),
};
