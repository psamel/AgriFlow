// Top Header Bar
import React from 'react';
import { IconPlay, IconRefresh, IconPlus } from './Icons';

export default function Header({ activePage, onSeedData, onResetData, onOpenWalkthrough, isBusy }) {
  const pageTitles = {
    overview: { title: 'Overview Dashboard', context: 'Real-time telemetry, soil moisture distribution, and priority queue' },
    explorer: { title: 'Plot Explorer (Spatial 2D Index)', context: 'Simulated 100x100 field Cartesian grid with C Quad-Tree range queries' },
    management: { title: 'Plot Management', context: 'Register sugarcane plots, search by ID, and inspect pool records' },
    sensors: { title: 'Sensor Updates (Key-Value Index)', context: 'Simulate telemetry updates via C Hash Map separate chaining in O(1)' },
    scheduler: { title: 'Irrigation Priority Scheduler', context: 'Water-budget dispatch engine powered by C Binary Min-Heap' },
    datastructures: { title: 'Data Structures Academic Deep-Dive', context: 'Quad-Tree, Separate-Chaining Hash Map, Binary Min-Heap & Shared Pool' },
    about: { title: 'About AgriFlow', context: 'KJS-AGR-01 sugarcane case study & CSBS IA-2 curriculum alignment' },
  };

  const current = pageTitles[activePage] || { title: 'AgriFlow', context: '' };

  return (
    <header className="app-header">
      <div className="header-left">
        <h2 className="header-title">{current.title}</h2>
        <span className="header-context">{current.context}</span>
      </div>

      <div className="header-actions">
        <button
          className="btn btn-gold btn-sm"
          onClick={onOpenWalkthrough}
          disabled={isBusy}
          title="Run documented 6-plot walkthrough demo"
        >
          <IconPlay size={14} />
          <span>Walkthrough</span>
        </button>

        <button
          className="btn btn-outline btn-sm"
          onClick={onSeedData}
          disabled={isBusy}
          title="Load 35 sample sugarcane plots"
        >
          <IconPlus size={14} />
          <span>Load Samples</span>
        </button>

        <button
          className="btn btn-outline btn-sm"
          onClick={onResetData}
          disabled={isBusy}
          title="Reset dataset and data structures"
        >
          <IconRefresh size={14} />
          <span>Reset</span>
        </button>
      </div>
    </header>
  );
}
