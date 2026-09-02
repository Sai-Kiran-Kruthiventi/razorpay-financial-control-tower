import React, { useState, useEffect } from 'react';
import { Incident } from '../types/index.js';
import {
  AlertTriangle,
  CheckCircle2,
  Layers,
  Search,
  HelpCircle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface IncidentsViewProps {
  onInvestigateRecordId: (recordId: string) => void;
  onExplainMoney: (paymentId: string) => void;
}

export const IncidentsView: React.FC<IncidentsViewProps> = ({
  onInvestigateRecordId,
  onExplainMoney
}) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidentRecords, setIncidentRecords] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OPEN' | 'INVESTIGATING' | 'RESOLVED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/incidents', { headers: { Accept: 'application/json' } });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const list = data.incidents || [];
        setIncidents(list);
        if (list.length > 0 && !selectedIncident) {
          setSelectedIncident(list[0]);
        }
      } else {
        throw new Error(`Failed to load issues (Status: ${res.status})`);
      }
    } catch (err: any) {
      console.error('Failed to fetch issues:', err);
      setFetchError(err.message || 'Unable to load issues');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    if (selectedIncident) {
      fetch(`/api/incidents/${encodeURIComponent(selectedIncident.id)}`, { headers: { Accept: 'application/json' } })
        .then(res => {
          const ct = res.headers.get('content-type') || '';
          return res.ok && ct.includes('application/json') ? res.json() : null;
        })
        .then(data => {
          if (data && data.affectedRecords) {
            setIncidentRecords(data.affectedRecords);
          }
        })
        .catch(console.error);
    }
  }, [selectedIncident]);

  const formatRupees = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

  const filteredIncidents = incidents.filter(inc => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'OPEN') return inc.status === 'OPEN' || inc.status === 'HUMAN_REVIEW_REQUIRED';
    if (activeFilter === 'INVESTIGATING') return inc.status === 'INVESTIGATING';
    if (activeFilter === 'RESOLVED') return inc.status === 'RESOLVED';
    return true;
  });

  const getPriorityBadge = (severity: string) => {
    const isHigh = severity === 'CRITICAL' || severity === 'HIGH';
    return (
      <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold uppercase tracking-wider bg-neutral-100 text-neutral-800 border border-neutral-300">
        {isHigh ? 'HIGH PRIORITY' : 'NEEDS REVIEW'}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
            RESOLVED
          </span>
        );
      case 'HUMAN_REVIEW_REQUIRED':
        return (
          <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold bg-neutral-200 text-neutral-900 border border-neutral-300">
            HUMAN REVIEW
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold bg-neutral-100 text-neutral-700 border border-neutral-300">
            INVESTIGATING
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold bg-black text-white">
            OPEN
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 bg-black"></span>
          <h1 className="text-base font-bold text-[#111111] tracking-tight uppercase">Issues</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs font-bold bg-neutral-100 text-neutral-700 border border-neutral-200 uppercase">
            Discrepancies Needing Attention
          </span>
        </div>
        <p className="text-xs text-neutral-600">
          Financial problems detected across payment gateways, bank settlement files, and merchant orders.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-2 border border-[#E5E5E0] rounded-xs flex items-center gap-1 overflow-x-auto text-xs font-medium">
        {[
          { id: 'ALL', label: 'All Issues' },
          { id: 'OPEN', label: 'Needs Attention' },
          { id: 'INVESTIGATING', label: 'Investigating' },
          { id: 'RESOLVED', label: 'Resolved' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveFilter(cat.id as any)}
            className={`px-3 py-1.5 rounded-xs transition-colors cursor-pointer whitespace-nowrap ${
              activeFilter === cat.id
                ? 'bg-black text-white font-medium'
                : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Issues List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-1 font-mono">
            <span>Detected Issues ({filteredIncidents.length})</span>
          </div>

          <div className="space-y-2.5">
            {isLoading ? (
              <div className="p-8 text-center text-neutral-500 text-xs font-mono bg-white border border-[#E5E5E0]">
                <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full mx-auto mb-2"></div>
                <span>Scanning multi-ledger issues...</span>
              </div>
            ) : fetchError ? (
              <div className="p-6 text-center text-neutral-800 text-xs font-mono bg-white border border-neutral-300">
                <p className="mb-2">⚠️ {fetchError}</p>
                <button
                  onClick={() => fetchIncidents()}
                  className="px-3 py-1 bg-black text-white text-[10px] uppercase font-bold rounded-xs cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div className="p-8 text-center bg-white border border-[#E5E5E0] rounded-xs space-y-1">
                <CheckCircle2 className="w-6 h-6 text-neutral-800 mx-auto mb-2" />
                <h3 className="text-xs font-bold text-[#111111]">No issues in this category.</h3>
                <p className="text-[11px] text-neutral-500">
                  All transactions in this filter are reconciled with zero variance.
                </p>
              </div>
            ) : (
              filteredIncidents.map(inc => {
                const isSelected = selectedIncident?.id === inc.id;

                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`bg-white border p-4 rounded-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-black ring-1 ring-black bg-[#F8F8F6]'
                        : 'border-[#E5E5E0] hover:border-neutral-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <div className="text-[10px] font-mono text-neutral-400 font-bold">{inc.id}</div>
                        <h3 className="text-xs font-bold text-[#111111] leading-tight">{inc.title}</h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getPriorityBadge(inc.severity)}
                        {getStatusBadge(inc.status)}
                      </div>
                    </div>

                    <p className="text-[11px] text-neutral-600 line-clamp-2 mb-3">
                      {inc.rootCauseSummary}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E0] text-[10px] font-mono">
                      <span className="text-neutral-500">
                        {inc.affectedRecordIds.length} related transactions
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-900 font-bold text-xs">
                          {formatRupees(inc.totalAmountAffected)} affected
                        </span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (inc.affectedRecordIds.length > 0) {
                              onInvestigateRecordId(inc.affectedRecordIds[0]);
                            }
                          }}
                          className="px-2 py-0.5 bg-black hover:bg-neutral-800 text-white text-[9px] uppercase font-bold tracking-wider rounded-xs cursor-pointer transition-colors"
                        >
                          Investigate
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Issue Detail & Safe Actions (7 cols) */}
        <div className="lg:col-span-7">
          {selectedIncident ? (
            <div className="bg-white border border-[#E5E5E0] rounded-xs p-6 space-y-6">
              {/* Issue Header */}
              <div className="space-y-2 pb-4 border-b border-[#E5E5E0]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">
                      Issue ID: {selectedIncident.id}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-xs font-mono bg-neutral-100 text-neutral-700 font-bold">
                      {selectedIncident.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getPriorityBadge(selectedIncident.severity)}
                    {getStatusBadge(selectedIncident.status)}
                  </div>
                </div>

                <h2 className="text-base font-bold text-[#111111]">
                  {selectedIncident.title}
                </h2>

                <div className="grid grid-cols-3 gap-3 pt-2 text-xs font-mono">
                  <div className="p-2.5 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xs">
                    <span className="text-[10px] text-neutral-500 block uppercase">Affected Capital</span>
                    <strong className="text-sm text-[#111111] font-bold">
                      {formatRupees(selectedIncident.totalAmountAffected)}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xs">
                    <span className="text-[10px] text-neutral-500 block uppercase">Related Ledgers</span>
                    <strong className="text-sm text-[#111111] font-bold">
                      {selectedIncident.affectedRecordIds.length} Transactions
                    </strong>
                  </div>
                  <div className="p-2.5 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xs">
                    <span className="text-[10px] text-neutral-500 block uppercase">Confidence</span>
                    <strong className="text-sm text-[#111111] font-bold">
                      {Math.round(selectedIncident.confidence * 100)}% Verified
                    </strong>
                  </div>
                </div>
              </div>

              {/* Root Cause Explanation */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#111111] uppercase font-mono">
                  <HelpCircle className="w-3.5 h-3.5 text-neutral-700" />
                  <span>Root Cause Analysis</span>
                </div>
                <div className="p-4 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xs text-xs text-neutral-800 leading-relaxed font-sans">
                  {selectedIncident.rootCauseSummary}
                </div>
              </div>

              {/* Related Transactions List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#111111] uppercase font-mono">
                    <Layers className="w-3.5 h-3.5 text-neutral-700" />
                    <span>Related Transactions ({incidentRecords.length})</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">Ledger Evidence</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {incidentRecords.map((rec, i) => (
                    <div
                      key={rec.id || i}
                      className="p-3 bg-white border border-[#E5E5E0] rounded-xs flex items-center justify-between gap-3 text-xs hover:border-neutral-400 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="font-mono text-[#111111]">{rec.id}</strong>
                          <span className="text-neutral-500 font-mono text-[11px]">{rec.paymentId}</span>
                        </div>
                        <p className="text-[11px] text-neutral-600 line-clamp-1">{rec.customerName}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="block font-mono font-bold text-[#111111]">
                            {formatRupees(rec.actualAmount)}
                          </span>
                          <span className="text-[9px] font-mono text-neutral-500 uppercase">
                            {rec.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onExplainMoney(rec.paymentId)}
                            className="px-2 py-1 bg-white border border-[#E5E5E0] hover:border-neutral-400 text-[10px] font-mono text-neutral-700 rounded-xs cursor-pointer transition-colors"
                            title="Trace payment lifecycle"
                          >
                            Trace
                          </button>
                          <button
                            onClick={() => onInvestigateRecordId(rec.id)}
                            className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white text-[10px] font-medium uppercase tracking-wider rounded-xs cursor-pointer transition-colors"
                          >
                            Investigate
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safe Action Execution Banner */}
              <div className="p-4 bg-[#111111] text-white rounded-xs flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-white/80" />
                    <span className="text-white/80 text-[10px] uppercase font-bold font-mono">
                      Safe Action Recommendation
                    </span>
                  </div>
                  <p className="text-xs text-white/80">
                    Run verified ledger adjustment across all {incidentRecords.length} related transactions.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (incidentRecords.length > 0) {
                      onInvestigateRecordId(incidentRecords[0].id);
                    }
                  }}
                  className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer shrink-0 transition-colors"
                >
                  Investigate Group
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white border border-[#E5E5E0] rounded-xs text-neutral-500 text-xs font-mono">
              Select an issue from the list on the left to inspect root cause, evidence, and related ledgers.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
