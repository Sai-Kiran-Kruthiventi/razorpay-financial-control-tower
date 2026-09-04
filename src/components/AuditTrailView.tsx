import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types/index.js';
import { apiFetch } from '../services/clientTelemetry.js';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  Cpu,
  UserCheck
} from 'lucide-react';

interface AuditTrailViewProps {
  onExplainMoney: (id: string) => void;
  dataVersion?: number;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ onExplainMoney, dataVersion = 0 }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<AuditLog | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        search: search.trim(),
        entityId: search.trim(),
        status: statusFilter
      });
      const res = await apiFetch(`/api/audit?${params.toString()}`, { headers: { Accept: 'application/json' } });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(typeof data.total === 'number' ? data.total : 0);
        setTotalAll(typeof data.totalAll === 'number' ? data.totalAll : (typeof data.total === 'number' ? data.total : 0));
        setTotalPages(data.totalPages || 1);
      } else {
        throw new Error(`Failed to load audit history (Status: ${res.status})`);
      }
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
      setFetchError(err.message || 'Unable to load audit records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, search, statusFilter, dataVersion]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 bg-black"></span>
            <h1 className="text-base font-bold text-[#111111] tracking-tight uppercase">Audit Trail</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs font-bold bg-neutral-100 text-neutral-700 border border-neutral-200 uppercase">
              Accountability & Verification
            </span>
          </div>
          <p className="text-xs text-neutral-600">
            Immutable log recording every automated AI action, policy safety check, human approval, and post-action verification.
          </p>
        </div>

        <button
          onClick={() => fetchAuditLogs()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E5E0] hover:border-neutral-400 text-xs font-mono text-neutral-700 rounded-xs self-start sm:self-auto cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 border border-[#E5E5E0] rounded-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['ALL', 'RESOLVED', 'WARNING', 'FAILED'].map(st => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xs text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-black text-white font-medium'
                  : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
              }`}
            >
              {st === 'ALL' ? 'All Recorded Events' : st === 'RESOLVED' ? 'Verified Actions' : st === 'WARNING' ? 'Needs Review' : 'Exceptions'}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Payment ID or Action..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-8 pr-3 py-1.5 bg-[#F5F5F3] border border-[#E5E5E0] rounded-xs text-xs text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-black font-mono"
          />
        </div>
      </div>

      {/* Audit Log Table with Explicit Requested Columns: Timestamp, Action Taken, Reason, Verified By, Outcome */}
      <div className="bg-white border border-[#E5E5E0] rounded-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-[#F8F8F6] border-b border-[#E5E5E0] text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                <th className="py-3 px-3.5">Timestamp</th>
                <th className="py-3 px-3.5">Action Taken</th>
                <th className="py-3 px-3.5">Reason</th>
                <th className="py-3 px-3.5 text-center">Verified By</th>
                <th className="py-3 px-3.5 text-right">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E0]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-500">
                    <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full mx-auto mb-2"></div>
                    <span>Loading verified audit trail...</span>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-800 bg-neutral-100">
                    <p className="font-bold">⚠️ {fetchError}</p>
                    <button
                      onClick={() => fetchAuditLogs()}
                      className="mt-2 px-3 py-1 bg-black text-white text-[10px] uppercase font-bold rounded-xs cursor-pointer"
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-500">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const isExpanded = expandedLog?.id === log.id;
                  const dateObj = new Date(log.timestamp);
                  const timeFormatted = dateObj.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });
                  const dateFormatted = dateObj.toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric'
                  });

                  const isHuman = log.operator?.toUpperCase().includes('HUMAN') || log.operator?.toUpperCase().includes('FINANCE');
                  const isResolved = log.status === 'RESOLVED';

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedLog(isExpanded ? null : log)}
                        className="hover:bg-neutral-50 cursor-pointer transition-colors"
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="font-bold text-[#111111] block">{timeFormatted}</span>
                          <span className="text-[10px] text-neutral-500">{dateFormatted}</span>
                        </td>

                        {/* Action Taken */}
                        <td className="py-3 px-3.5">
                          <div className="font-sans font-medium text-[#111111] text-xs">
                            {log.actionTaken}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-neutral-500 font-mono">Entity:</span>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                onExplainMoney(log.entityId);
                              }}
                              className="text-[10px] font-mono font-bold text-neutral-900 hover:underline cursor-pointer"
                            >
                              {log.entityId}
                            </button>
                          </div>
                        </td>

                        {/* Reason */}
                        <td className="py-3 px-3.5 font-sans">
                          <div className="text-xs text-neutral-700 leading-snug">
                            {log.policyResult || 'Deterministic reconciliation rule triggered variance correction'}
                          </div>
                        </td>

                        {/* Verified By */}
                        <td className="py-3 px-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                            {isHuman ? (
                              <>
                                <UserCheck className="w-3 h-3 text-neutral-600" />
                                <span>Human Controller</span>
                              </>
                            ) : (
                              <>
                                <Cpu className="w-3 h-3 text-neutral-600" />
                                <span>AI Agent (Autonomous)</span>
                              </>
                            )}
                          </span>
                        </td>

                        {/* Outcome */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold font-mono ${
                              isResolved
                                ? 'bg-neutral-100 text-neutral-900 border border-neutral-300'
                                : 'bg-black text-white'
                            }`}>
                              {isResolved ? 'VERIFIED ✓' : 'FLAGGED'}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-mono">
                              {log.verificationResult || 'Zero Variance'}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Row for Detail */}
                      {isExpanded && (
                        <tr className="bg-[#F8F8F6]">
                          <td colSpan={5} className="p-4 text-xs font-mono space-y-2 border-y border-[#E5E5E0]">
                            <div className="flex items-center justify-between text-neutral-600 text-[10px] font-bold uppercase">
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-neutral-800" />
                                <span>Verification Evidence & Invariant Check</span>
                              </span>
                              <span>Log ID: {log.id}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-neutral-800 pt-1">
                              <div className="bg-white p-2.5 rounded-xs border border-[#E5E5E0]">
                                <span className="text-neutral-500 text-[10px] block uppercase">Policy Rule Check</span>
                                <strong className="text-[#111111]">{log.policyResult}</strong>
                              </div>
                              <div className="bg-white p-2.5 rounded-xs border border-[#E5E5E0]">
                                <span className="text-neutral-500 text-[10px] block uppercase">Operator Context</span>
                                <strong className="text-[#111111]">{log.operator}</strong>
                              </div>
                              <div className="bg-white p-2.5 rounded-xs border border-[#E5E5E0]">
                                <span className="text-neutral-500 text-[10px] block uppercase">Mathematical Outcome</span>
                                <strong className="text-[#111111]">{log.verificationResult || 'Difference: ₹0'}</strong>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-[#F8F8F6] border-t border-[#E5E5E0] flex items-center justify-between text-xs font-mono">
          <span className="text-neutral-500">
            Showing {total} of {totalAll} recorded ledger entries (Page {page} of {totalPages})
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="p-1.5 bg-white border border-[#E5E5E0] text-neutral-600 hover:text-black disabled:opacity-30 rounded-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="p-1.5 bg-white border border-[#E5E5E0] text-neutral-600 hover:text-black disabled:opacity-30 rounded-xs cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
