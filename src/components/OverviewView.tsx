import React, { useState } from 'react';
import { DashboardMetrics, Incident } from '../types/index.js';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  GitCompare,
  TrendingDown,
  Layers,
  ArrowDown
} from 'lucide-react';

interface OverviewViewProps {
  metrics: DashboardMetrics | null;
  onNavigate: (view: any, query?: string) => void;
  onSelectIncident: (inc: Incident) => void;
  onOpenDemo?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  metrics,
  onNavigate,
  onSelectIncident,
  onOpenDemo
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!metrics) {
    return (
      <div className="p-16 text-center text-neutral-500">
        <div className="animate-spin w-7 h-7 border-2 border-black border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-xs font-mono tracking-wider uppercase text-neutral-600">Loading Financial Control Tower Telemetry...</p>
      </div>
    );
  }

  const formatRupees = (amount: number) => {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  };

  const formatLakhs = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return formatRupees(amount);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('explain-money', searchQuery.trim());
    } else {
      onNavigate('explain-money', 'pay_80007');
    }
  };

  const totalRecords = metrics.totalRecords ?? 0;
  const matchedCount = metrics.matchedCount ?? 0;
  const exceptionCount = metrics.exceptionCount ?? 0;
  const resolvedCount = metrics.resolvedCount ?? 0;
  const humanReviewCount = metrics.humanReviewCount ?? 0;
  const investigatingCount = metrics.investigatingCount ?? 0;
  const unresolvedCount = metrics.unresolvedCount ?? 0;
  const openCount = metrics.openCount ?? (humanReviewCount + investigatingCount + unresolvedCount);

  // Single source of truth for active unresolved incidents requiring operational attention
  const unresolvedIncidents = (metrics.activeIncidents || []).filter(
    inc => inc.status !== 'RESOLVED' && inc.status !== 'DISMISSED'
  );
  
  const totalProcessed = metrics.totalProcessed;
  const moneyAtRisk = metrics.unresolvedAmount || Math.max(0, metrics.amountAffected - metrics.resolvedAmount);
  const moneyResolved = metrics.resolvedAmount;
  const issuesDetectedAmount = metrics.amountAffected;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* HEADER / COMMAND STATUS */}
      <div className="bg-white border border-[#E5E5E0] rounded-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-neutral-500">
              OPERATIONAL STATUS • MULTI-LEDGER ENGINE ACTIVE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-[#111111] tracking-tight">
            Financial Control Room
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 font-sans">
            {openCount > 0 ? (
              <span>
                <strong className="text-[#111111] font-semibold">{openCount} open issues</strong> require attention ({formatRupees(moneyAtRisk)} capital at risk across monitored transactions).
              </span>
            ) : (
              'All monitored payments and settlements are reconciled with ₹0 variance.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            id="btn-overview-review-issues"
            onClick={() => onNavigate('incidents')}
            className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xs text-xs font-medium uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span>Review Issues ({openCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigate('reconciliation')}
            className="px-4 py-2 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-xs text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <GitCompare className="w-3.5 h-3.5 text-neutral-600" />
            <span>Reconciliation</span>
          </button>
        </div>
      </div>

      {/* PRIMARY METRICS (EXACTLY 4 CLEAR METRIC CARDS) */}
      <div>
        <div className="text-[10px] text-neutral-500 uppercase font-mono tracking-widest font-bold mb-2.5 flex items-center justify-between">
          <span>Primary Financial Metrics</span>
          <span className="font-mono text-neutral-400">
            {metrics.baselineRecords ?? totalRecords} Baseline Records
            {metrics.simulatedRecords ? ` + ${metrics.simulatedRecords} Simulated` : ''} 
            {' '}(Total Monitored: {totalRecords})
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: MONEY PROCESSED */}
          <div className="bg-white p-5 border border-[#E5E5E0] rounded-xs">
            <div className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider font-bold mb-1">
              Money Processed
            </div>
            <div className="text-3xl font-light font-mono tracking-tight text-[#111111]">
              {formatLakhs(totalProcessed)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-2 font-sans">
              {metrics.baselineRecords ?? totalRecords} baseline {metrics.simulatedRecords ? `+ ${metrics.simulatedRecords} simulated ` : ''}transactions
            </div>
          </div>

          {/* Card 2: MONEY AT RISK */}
          <div className="bg-white p-5 border border-[#E5E5E0] rounded-xs">
            <div className="text-[10px] text-neutral-600 uppercase font-mono tracking-wider font-bold mb-1 flex items-center justify-between">
              <span>Money at Risk</span>
              {moneyAtRisk > 0 && <span className="w-1.5 h-1.5 rounded-full bg-neutral-900"></span>}
            </div>
            <div className="text-3xl font-light font-mono tracking-tight text-[#111111]">
              {formatLakhs(moneyAtRisk)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-2 font-sans">
              Across {openCount} open issues ({investigatingCount} investigating)
            </div>
          </div>

          {/* Card 3: MONEY RESOLVED */}
          <div className="bg-white p-5 border border-[#E5E5E0] rounded-xs">
            <div className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider font-bold mb-1">
              Money Resolved
            </div>
            <div className="text-3xl font-light font-mono tracking-tight text-[#111111]">
              {formatLakhs(moneyResolved)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-2 font-sans">
              Verified by reconciliation (Variance: ₹0)
            </div>
          </div>

          {/* Card 4: OPEN ISSUES */}
          <div className="bg-white p-5 border border-[#E5E5E0] rounded-xs">
            <div className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider font-bold mb-1">
              Open Issues
            </div>
            <div className="text-3xl font-light font-mono tracking-tight text-[#111111]">
              {openCount}
            </div>
            <div className="text-[11px] text-neutral-500 mt-2 font-sans">
              {humanReviewCount} human review, {investigatingCount} investigating, {unresolvedCount} unresolved
            </div>
          </div>
        </div>
      </div>

      {/* RECONCILIATION SUMMARY & MATHEMATICAL IDENTITY */}
      <div className="bg-white border border-[#E5E5E0] rounded-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E5E5E0] gap-2">
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider font-bold text-neutral-500">
              Deterministic Ledger Audit
            </div>
            <h2 className="text-sm font-bold text-[#111111] uppercase tracking-wide">
              Reconciliation Status Breakdown
            </h2>
          </div>
          <div className="text-xs font-mono text-neutral-500">
            Total Monitored: <strong className="text-[#111111] font-bold">{totalRecords} Records</strong> ({metrics.baselineRecords ?? totalRecords} baseline{metrics.simulatedRecords ? ` + ${metrics.simulatedRecords} simulated` : ''})
          </div>
        </div>

        {/* Tree Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Matched Branch */}
          <div className="p-4 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-neutral-800" />
                <span className="text-xs font-bold text-[#111111] uppercase font-mono">Matched Records</span>
              </div>
              <span className="text-xs font-mono font-bold text-neutral-800">
                {((matchedCount / totalRecords) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-mono font-light text-[#111111]">
              {matchedCount} <span className="text-xs font-sans text-neutral-500 font-normal">records</span>
            </div>
            <p className="text-[11px] text-neutral-600 font-sans">
              Orders, payment gateway captures, bank RRNs, and settlements match with zero variance.
            </p>
          </div>

          {/* Exceptions Branch */}
          <div className="p-4 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-neutral-800" />
                <span className="text-xs font-bold text-[#111111] uppercase font-mono">Exceptions Detected</span>
              </div>
              <span className="text-xs font-mono font-bold text-neutral-800">
                {((exceptionCount / totalRecords) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-mono font-light text-[#111111]">
              {exceptionCount} <span className="text-xs font-sans text-neutral-500 font-normal">exceptions</span>
            </div>
            <p className="text-[11px] text-neutral-600 font-sans">
              Identified anomalies, duplicates, delayed events, and settlement mismatches.
            </p>
          </div>
        </div>

        {/* Status Breakdown of the Exceptions */}
        <div className="pt-2">
          <div className="text-[10px] uppercase font-mono tracking-wider font-bold text-neutral-500 mb-2">
            Exceptions Resolution Status (Total: {exceptionCount})
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 border border-[#E5E5E0] bg-white rounded-xs">
              <div className="text-[10px] text-neutral-500 uppercase">AI Resolved</div>
              <div className="text-lg font-bold text-[#111111] mt-0.5">{resolvedCount}</div>
              <div className="text-[10px] text-neutral-500 font-sans">Verified ₹0 difference</div>
            </div>
            <div className="p-3 border border-[#E5E5E0] bg-white rounded-xs">
              <div className="text-[10px] text-neutral-500 uppercase">Human Review</div>
              <div className="text-lg font-bold text-[#111111] mt-0.5">{humanReviewCount}</div>
              <div className="text-[10px] text-neutral-500 font-sans">&gt; ₹5,000 threshold</div>
            </div>
            <div className="p-3 border border-[#E5E5E0] bg-white rounded-xs">
              <div className="text-[10px] text-neutral-500 uppercase">Investigating</div>
              <div className="text-lg font-bold text-[#111111] mt-0.5">{investigatingCount}</div>
              <div className="text-[10px] text-neutral-500 font-sans">Active diagnostic agent</div>
            </div>
            <div className="p-3 border border-[#E5E5E0] bg-white rounded-xs">
              <div className="text-[10px] text-neutral-500 uppercase">Unresolved</div>
              <div className="text-lg font-bold text-[#111111] mt-0.5">{unresolvedCount}</div>
              <div className="text-[10px] text-neutral-500 font-sans">Pending dual-control</div>
            </div>
          </div>
        </div>

        {/* Mathematical Check Footnote */}
        <div className="pt-3 border-t border-[#E5E5E0] flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono text-neutral-500 gap-1">
          <div>
            Identity: {matchedCount} (Matched) + {exceptionCount} (Exceptions) = {totalRecords} Total Records | Exceptions: {resolvedCount} (AI Resolved) + {humanReviewCount} (Human Review) + {investigatingCount} (Investigating) + {unresolvedCount} (Unresolved) = {exceptionCount} Total Exceptions.
          </div>
          <div className="text-neutral-700 font-medium">
            Status: Fully Accounted
          </div>
        </div>
      </div>

      {/* ATTENTION NEEDED (PROBLEMS NEEDING ATTENTION) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-neutral-900"></span>
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#111111] font-mono font-bold">
              Attention Needed
            </h2>
          </div>
          <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase">
            {unresolvedIncidents.length} Active Problems
          </span>
        </div>

        <div className="space-y-2.5">
          {unresolvedIncidents.length === 0 ? (
            <div className="bg-white border border-[#E5E5E0] p-8 text-center rounded-xs">
              <CheckCircle2 className="w-6 h-6 text-neutral-800 mx-auto mb-2" />
              <p className="text-xs font-medium text-[#111111]">No issues currently require attention.</p>
              <p className="text-[11px] text-neutral-500 font-mono mt-1">All exceptions have been verified and reconciled.</p>
            </div>
          ) : (
            unresolvedIncidents.map(inc => {
              const isHigh = inc.severity === 'CRITICAL' || inc.severity === 'HIGH';
              return (
                <div
                  key={inc.id}
                  id={`issue-card-${inc.id}`}
                  onClick={() => onSelectIncident(inc)}
                  className="bg-white border border-[#E5E5E0] hover:border-neutral-400 p-4 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors cursor-pointer"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#111111]">{inc.title}</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-xs font-bold uppercase">
                        {isHigh ? 'HIGH PRIORITY' : 'NEEDS REVIEW'}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {inc.affectedRecordIds.length} related transactions
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-600 font-sans line-clamp-1">
                      {inc.rootCauseSummary}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                    <div className="text-left sm:text-right">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase block">Affected Amount</span>
                      <strong className="text-sm font-mono font-bold text-[#111111]">
                        {formatRupees(inc.totalAmountAffected)}
                      </strong>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onSelectIncident(inc);
                      }}
                      className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white text-[10px] uppercase font-bold tracking-wider rounded-xs cursor-pointer transition-colors"
                    >
                      Investigate →
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* OPERATIONAL FLOW: FIND → UNDERSTAND → ACT SAFELY → VERIFY */}
      <div className="bg-[#111111] text-white p-6 rounded-xs border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 font-bold">
              Operating Philosophy
            </span>
            <span className="text-xs text-white/40 font-mono">• 4 Deterministic Stages</span>
          </div>
          <button
            onClick={() => onNavigate('how-it-works')}
            className="text-[10px] uppercase font-mono tracking-wider text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            System Architecture →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stage 1: FIND */}
          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-xs bg-white text-black text-[10px] font-mono font-bold flex items-center justify-center">
                1
              </span>
              <h4 className="text-xs font-bold text-white uppercase font-mono">Find</h4>
            </div>
            <p className="text-xs text-white/70 font-sans leading-relaxed">
              Connect multi-party ledgers to detect variances across orders, payments, and settlements.
            </p>
          </div>

          {/* Stage 2: UNDERSTAND */}
          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-xs bg-white text-black text-[10px] font-mono font-bold flex items-center justify-center">
                2
              </span>
              <h4 className="text-xs font-bold text-white uppercase font-mono">Understand</h4>
            </div>
            <p className="text-xs text-white/70 font-sans leading-relaxed">
              Reconstruct multi-hop event chains, gather ledger proofs, and isolate exact root causes.
            </p>
          </div>

          {/* Stage 3: ACT SAFELY */}
          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-xs bg-white text-black text-[10px] font-mono font-bold flex items-center justify-center">
                3
              </span>
              <h4 className="text-xs font-bold text-white uppercase font-mono">Act Safely</h4>
            </div>
            <p className="text-xs text-white/70 font-sans leading-relaxed">
              Enforce strict policy rules: ≤ ₹5,000 auto-reconcile, &gt; ₹5,000 requires human authorization.
            </p>
          </div>

          {/* Stage 4: VERIFY */}
          <div className="p-3.5 bg-white/5 border border-white/10 rounded-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-xs bg-white text-black text-[10px] font-mono font-bold flex items-center justify-center">
                4
              </span>
              <h4 className="text-xs font-bold text-white uppercase font-mono">Verify</h4>
            </div>
            <p className="text-xs text-white/70 font-sans leading-relaxed">
              Re-query external gateways and balance sheets to mathematically verify net difference equals ₹0.
            </p>
          </div>
        </div>
      </div>

      {/* QUICK COMMAND SEARCH (EXPLAIN THIS MONEY) */}
      <div className="bg-white border border-[#E5E5E0] p-5 rounded-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-[200px]">
          <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 font-bold block">
            Command Search
          </span>
          <strong className="text-sm font-bold text-[#111111]">Explain This Money</strong>
          <p className="text-[11px] text-neutral-500 font-sans">Trace any payment through checkout, gateway, webhook and settlement</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              id="input-overview-search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Enter Payment ID (pay_80007), Order ID (order_10007)..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#F5F5F3] border border-[#E5E5E0] rounded-xs text-xs font-mono text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-black"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-medium font-mono uppercase tracking-wider rounded-xs cursor-pointer transition-colors shrink-0"
          >
            Trace
          </button>
        </form>
      </div>
    </div>
  );
};
