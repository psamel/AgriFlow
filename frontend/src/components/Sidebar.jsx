// AgriFlow Navigation Sidebar
import React from 'react';
import {
  IconOverview,
  IconMap,
  IconPlotManagement,
  IconDroplets,
  IconScheduler,
  IconDataStructures,
  IconAbout,
  IconPlay
} from './Icons';

export default function Sidebar({ activePage, setActivePage, plotCount = 0, onOpenWalkthrough }) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: IconOverview },
    { id: 'explorer', label: 'Plot Explorer', icon: IconMap },
    { id: 'management', label: 'Plot Management', icon: IconPlotManagement, badge: plotCount },
    { id: 'sensors', label: 'Sensor Updates', icon: IconDroplets },
    { id: 'scheduler', label: 'Irrigation Scheduler', icon: IconScheduler },
    { id: 'datastructures', label: 'Data Structures', icon: IconDataStructures },
    { id: 'about', label: 'About AgriFlow', icon: IconAbout },
  ];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <span className="brand-badge">KIAAR • KJS-AGR-01</span>
        <h1 className="brand-title">AGRIFLOW</h1>
        <p className="brand-subtitle">Sugarcane Irrigation Advisory System</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="nav-item-badge">{item.badge}</span>
              )}
            </button>
          );
        })}

        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
          <button
            className="btn btn-gold"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={onOpenWalkthrough}
          >
            <IconPlay size={14} />
            <span>Walkthrough Demo</span>
          </button>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="system-status-indicator">
          <div className="status-dot"></div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--color-gold)' }}>C99 Engine Active</div>
            <div style={{ opacity: 0.7, fontSize: '0.68rem' }}>QuadTree • HashMap • MinHeap</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
