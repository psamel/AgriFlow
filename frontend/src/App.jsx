// AgriFlow Main Application Component
import React, { useState, useEffect } from 'react';
import { api } from './api';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WalkthroughModal from './components/WalkthroughModal';

// Pages
import Overview from './pages/Overview';
import PlotExplorer from './pages/PlotExplorer';
import PlotManagement from './pages/PlotManagement';
import SensorUpdates from './pages/SensorUpdates';
import IrrigationScheduler from './pages/IrrigationScheduler';
import DataStructures from './pages/DataStructures';
import AboutAgriFlow from './pages/AboutAgriFlow';

export default function App() {
  const [activePage, setActivePage] = useState('overview');
  const [overviewData, setOverviewData] = useState(null);
  const [allPlots, setAllPlots] = useState([]);
  const [isBusy, setIsBusy] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  // Walkthrough Modal State
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [walkthroughData, setWalkthroughData] = useState(null);

  // Load backend telemetry and plot data
  const loadData = async () => {
    setIsBusy(true);
    setErrorBanner('');
    try {
      const [ovData, plotData] = await Promise.all([
        api.getOverview(),
        api.getPlots(1000),
      ]);
      setOverviewData(ovData);
      setAllPlots(plotData.plots || []);
    } catch (err) {
      console.error('Failed to load backend data:', err);
      setErrorBanner('Backend C Engine not reachable at http://127.0.0.1:5000. Ensure Flask server is running.');
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick Seed Handler
  const handleSeedData = async (count = 35, seed = 42) => {
    setIsBusy(true);
    try {
      await api.seedDataset(count, seed);
      await loadData();
    } catch (err) {
      alert(`Error loading sample plots: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  // Reset Handler
  const handleResetData = async () => {
    if (!window.confirm('Reset all plots and data structures? This will clear the central pool, Quad-Tree, and Hash Map.')) {
      return;
    }
    setIsBusy(true);
    try {
      await api.resetDataset();
      await loadData();
    } catch (err) {
      alert(`Error resetting dataset: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  // Run Walkthrough Demo
  const handleRunWalkthrough = async () => {
    setIsBusy(true);
    try {
      const res = await api.runWalkthrough();
      setWalkthroughData(res);
      await loadData();
    } catch (err) {
      alert(`Walkthrough execution failed: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleOpenWalkthrough = () => {
    setWalkthroughOpen(true);
    if (!walkthroughData) {
      handleRunWalkthrough();
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        plotCount={allPlots.length}
        onOpenWalkthrough={handleOpenWalkthrough}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Header
          activePage={activePage}
          onSeedData={() => handleSeedData(35, 42)}
          onResetData={handleResetData}
          onOpenWalkthrough={handleOpenWalkthrough}
          isBusy={isBusy}
        />

        {errorBanner && (
          <div style={{ padding: '16px 28px 0 28px' }}>
            <div className="alert alert-danger" style={{ margin: 0 }}>
              <span>{errorBanner}</span>
            </div>
          </div>
        )}

        {/* Page Switcher */}
        {activePage === 'overview' && (
          <Overview
            overviewData={overviewData}
            onNavigate={setActivePage}
            onSeedData={handleSeedData}
            onOpenWalkthrough={handleOpenWalkthrough}
            isBusy={isBusy}
          />
        )}

        {activePage === 'explorer' && (
          <PlotExplorer
            allPlots={allPlots}
            onRefreshData={loadData}
          />
        )}

        {activePage === 'management' && (
          <PlotManagement
            allPlots={allPlots}
            onRefreshData={loadData}
            isBusy={isBusy}
          />
        )}

        {activePage === 'sensors' && (
          <SensorUpdates
            onRefreshData={loadData}
            isBusy={isBusy}
          />
        )}

        {activePage === 'scheduler' && (
          <IrrigationScheduler
            isBusy={isBusy}
          />
        )}

        {activePage === 'datastructures' && (
          <DataStructures />
        )}

        {activePage === 'about' && (
          <AboutAgriFlow />
        )}
      </div>

      {/* Walkthrough Demo Modal */}
      <WalkthroughModal
        isOpen={walkthroughOpen}
        onClose={() => setWalkthroughOpen(false)}
        onRunWalkthrough={handleRunWalkthrough}
        walkthroughData={walkthroughData}
        isBusy={isBusy}
      />
    </div>
  );
}
