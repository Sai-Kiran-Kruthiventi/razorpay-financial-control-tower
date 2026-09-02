import React, { useState, useEffect } from 'react';
import { Sidebar, NavView } from './components/Sidebar.js';
import { OverviewView } from './components/OverviewView.js';
import { ReconciliationView } from './components/ReconciliationView.js';
import { IncidentsView } from './components/IncidentsView.js';
import { TransactionsView } from './components/TransactionsView.js';
import { ExplainMoneyView } from './components/ExplainMoneyView.js';
import { AuditTrailView } from './components/AuditTrailView.js';
import { EvaluationView } from './components/EvaluationView.js';
import { HowItWorksView } from './components/HowItWorksView.js';
import { InvestigationModal } from './components/InvestigationModal.js';
import { LiveSimulatorModal } from './components/LiveSimulatorModal.js';
import { InteractiveDemoModal } from './components/InteractiveDemoModal.js';
import { DemoWalkthroughBanner } from './components/DemoWalkthroughBanner.js';
import { DashboardMetrics, ReconciliationRecord, Incident } from './types/index.js';
import {
  Bell,
  Search,
  Sparkles,
  Zap,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
  Server,
  Layers,
  Play
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<NavView>('overview');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [reconciliationFilter, setReconciliationFilter] = useState<string>('ALL');
  const [explainQueryId, setExplainQueryId] = useState<string>('pay_80007');
  const [investigatingRecord, setInvestigatingRecord] = useState<ReconciliationRecord | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/dashboard', { headers: { Accept: 'application/json' } });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setMetrics(data);
        setLastRefreshed(new Date());
        setApiError(null);
      } else {
        throw new Error(`Server returned status ${res.status}`);
      }
    } catch (err: any) {
      console.warn('Failed to fetch dashboard metrics:', err);
      setApiError('Unable to connect to live telemetry stream. Retrying automatically...');
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/reset-data', { method: 'POST', headers: { Accept: 'application/json' } });
      await fetchMetrics();
      setCurrentView('overview');
    } catch (err) {
      console.error('Failed to reset dataset:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleInvestigateRecord = (rec: ReconciliationRecord) => {
    setInvestigatingRecord(rec);
  };

  const handleInvestigateRecordId = async (recordId: string) => {
    try {
      const res = await fetch(`/api/reconciliation/${encodeURIComponent(recordId)}`, { headers: { Accept: 'application/json' } });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.record) {
          setInvestigatingRecord(data.record);
        }
      }
    } catch (err) {
      console.error('Failed to fetch record for investigation:', err);
    }
  };

  const handleExplainMoney = (id: string) => {
    setExplainQueryId(id);
    setCurrentView('explain-money');
  };

  const handleSelectIncident = (inc: Incident) => {
    setCurrentView('incidents');
  };

  const handleNavigateFromOverview = (view: NavView, query?: string) => {
    if (view === 'reconciliation' && query) {
      setReconciliationFilter(query);
    }
    if (view === 'explain-money' && query) {
      setExplainQueryId(query);
    }
    setCurrentView(view);
  };

  const handleDemoStepAction = (view: NavView, param?: string) => {
    if (view === 'reconciliation') {
      if (param) setReconciliationFilter(param);
      if (param === 'EXCEPTION') {
        // Automatically open REC-007 for step 5
        fetch('/api/reconciliation/REC-007', { headers: { Accept: 'application/json' } })
          .then(res => {
            const ct = res.headers.get('content-type') || '';
            return res.ok && ct.includes('application/json') ? res.json() : null;
          })
          .then(data => {
            if (data && data.record) setInvestigatingRecord(data.record);
          })
          .catch(() => {});
      }
    } else if (view === 'explain-money' && param) {
      setExplainQueryId(param);
    }
    setCurrentView(view);
  };

  const [headerSearch, setHeaderSearch] = useState('');
  const [dataMode, setDataMode] = useState<'SYNTHETIC' | 'RAZORPAY_TEST'>('SYNTHETIC');

  const getContextTitle = (view: NavView) => {
    switch (view) {
      case 'overview':
        return 'FINANCIAL CONTROL ROOM';
      case 'incidents':
        return 'ACTIVE PROBLEMS & ISSUES';
      case 'reconciliation':
        return 'PAYMENT MATCHING RECONCILIATION';
      case 'transactions':
        return 'FINANCIAL LEDGERS & TRANSACTIONS';
      case 'explain-money':
        return 'EXPLAIN THIS MONEY';
      case 'audit':
        return 'AUDIT TRAIL & VERIFICATION';
      case 'how-it-works':
        return 'PRODUCT ARCHITECTURE';
      case 'evaluation':
        return 'BENCHMARK EVALUATION (TRACK 04)';
      default:
        return 'FINANCIAL CONTROL TOWER';
    }
  };

  const handleHeaderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (headerSearch.trim()) {
      handleExplainMoney(headerSearch.trim());
      setHeaderSearch('');
    }
  };

  return (
    <div className="flex h-screen bg-[#FBFBF9] font-sans text-[#111111] overflow-hidden antialiased select-text">
      {/* Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        exceptionCount={metrics?.exceptionCount || 0}
        openIncidentCount={metrics?.activeIncidents?.filter(i => i.status !== 'RESOLVED').length || 0}
        onResetData={handleResetData}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenDemo={() => setIsDemoModalOpen(true)}
        isResetting={isResetting}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#FBFBF9]">
        {/* CONTEXTUAL TOP BAR */}
        <header className="h-14 bg-white border-b border-[#E5E5E0] px-5 md:px-7 flex items-center justify-between gap-4 shrink-0 z-10">
          {/* Left: Context Title */}
          <div className="flex items-center gap-2.5 min-w-[200px]">
            <span className="w-1.5 h-1.5 bg-black shrink-0"></span>
            <span className="text-xs font-mono font-bold tracking-wider text-[#111111] truncate">
              {getContextTitle(currentView)}
            </span>
          </div>

          {/* Center: Command-Style Search Field */}
          <form
            onSubmit={handleHeaderSearchSubmit}
            className="flex-1 max-w-md hidden md:block"
          >
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={headerSearch}
                onChange={e => setHeaderSearch(e.target.value)}
                placeholder="Search Payment ID, Order ID or Transaction ID..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#F5F5F3] border border-[#E5E5E0] rounded-xs text-xs font-mono text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-black transition-colors"
              />
            </div>
          </form>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 shrink-0 text-xs">
            {/* Mode Pill */}
            <button
              onClick={() => setDataMode(dataMode === 'SYNTHETIC' ? 'RAZORPAY_TEST' : 'SYNTHETIC')}
              title="Click to toggle between Synthetic Benchmark (Seed 42) and Live Razorpay Test Mode"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-xs font-mono text-[10px] text-neutral-700 cursor-pointer transition-colors"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dataMode === 'SYNTHETIC' ? 'bg-neutral-900' : 'bg-neutral-500'}`}></span>
              <span>{dataMode === 'SYNTHETIC' ? 'SYNTHETIC BENCHMARK' : 'RAZORPAY TEST MODE'}</span>
            </button>

            {/* Primary Action: Simulate Issue */}
            <button
              id="btn-topbar-simulate"
              onClick={() => setIsSimulatorOpen(true)}
              className="px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-xs text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Zap className="w-3 h-3 text-white/80" />
              <span className="hidden sm:inline">Simulate Issue</span>
            </button>

            {/* 60s Demo Button */}
            <button
              id="btn-topbar-run-demo"
              onClick={() => setIsDemoModalOpen(true)}
              className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-xs text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3 text-neutral-600" />
              <span>60s Demo</span>
            </button>
          </div>
        </header>

        {/* Guided Demo Walkthrough Banner */}
        <DemoWalkthroughBanner
          onStepAction={handleDemoStepAction}
          onOpenInteractiveDemo={() => setIsDemoModalOpen(true)}
        />

        {/* Global Connection / Warning Banner */}
        {apiError && (
          <div className="bg-neutral-100 border-b border-neutral-300 px-8 py-2 flex items-center justify-between text-xs text-neutral-800">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-neutral-700 shrink-0" />
              <span>{apiError}</span>
            </div>
            <button
              onClick={() => fetchMetrics()}
              className="px-2.5 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-[11px] font-mono font-medium rounded-xs transition-colors cursor-pointer"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* Dynamic Page Views */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#FBFBF9]">
          {currentView === 'overview' && (
            <OverviewView
              metrics={metrics}
              onNavigate={handleNavigateFromOverview}
              onSelectIncident={handleSelectIncident}
              onOpenDemo={() => setIsDemoModalOpen(true)}
            />
          )}

          {currentView === 'reconciliation' && (
            <ReconciliationView
              initialStatusFilter={reconciliationFilter}
              metrics={metrics}
              onInvestigate={handleInvestigateRecord}
              onExplainMoney={handleExplainMoney}
              onApproveAction={handleInvestigateRecord}
            />
          )}

          {currentView === 'incidents' && (
            <IncidentsView
              onInvestigateRecordId={handleInvestigateRecordId}
              onExplainMoney={handleExplainMoney}
            />
          )}

          {currentView === 'transactions' && (
            <TransactionsView onExplainMoney={handleExplainMoney} />
          )}

          {currentView === 'explain-money' && (
            <ExplainMoneyView
              initialQuery={explainQueryId}
              onInvestigate={handleInvestigateRecord}
            />
          )}

          {currentView === 'audit' && (
            <AuditTrailView onExplainMoney={handleExplainMoney} />
          )}

          {currentView === 'how-it-works' && (
            <HowItWorksView />
          )}

          {currentView === 'evaluation' && (
            <EvaluationView />
          )}
        </main>

        {/* SECTION 38 — SUBTLE BOTTOM SYSTEM STATUS BAR */}
        <footer className="h-7 bg-[#141414] border-t border-white/10 px-5 flex items-center justify-between text-[10px] font-mono text-white/50 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-white/80 font-semibold">SYSTEM HEALTHY</span>
            <span className="text-white/30">|</span>
            <span>500 RECORDS MONITORED</span>
            <span className="text-white/30">|</span>
            <span>AI INVESTIGATION READY</span>
            <span className="text-white/30">|</span>
            <span className="text-emerald-400">DETERMINISTIC ENGINE ACTIVE</span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-white/40">
            <span>SEED: 42 (FIXED)</span>
            <span>SAFETY: ≤ ₹5,000 AUTO</span>
            <span className="text-white/60">TRACK 04</span>
          </div>
        </footer>
      </div>

      {/* Investigation Modal */}
      {investigatingRecord && (
        <InvestigationModal
          record={investigatingRecord}
          onClose={() => setInvestigatingRecord(null)}
          onActionComplete={() => {
            fetchMetrics();
          }}
        />
      )}

      {/* Interactive 60-Second Demo Modal */}
      {isDemoModalOpen && (
        <InteractiveDemoModal
          isOpen={isDemoModalOpen}
          onClose={() => setIsDemoModalOpen(false)}
          onComplete={() => {
            fetchMetrics();
          }}
        />
      )}

      {/* Live Simulator Modal */}
      {isSimulatorOpen && (
        <LiveSimulatorModal
          onClose={() => {
            setIsSimulatorOpen(false);
            fetchMetrics();
          }}
          onSimulated={rec => {
            fetchMetrics();
          }}
          onNavigateView={view => {
            setIsSimulatorOpen(false);
            setCurrentView(view);
            fetchMetrics();
          }}
        />
      )}
    </div>
  );
}
