import React, { useState, useEffect } from 'react';
import { ReconciliationRecord, RecordStatus, DashboardMetrics } from '../types/index.js';
import { apiFetch } from '../services/clientTelemetry.js';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  GitCompare,
  ArrowRight
} from 'lucide-react';

interface ReconciliationViewProps {
  initialStatusFilter?: string;
  metrics?: DashboardMetrics | null;
  dataVersion?: number;
  onInvestigate: (record: ReconciliationRecord) => void;
  onExplainMoney: (queryId: string) => void;
  onApproveAction: (record: ReconciliationRecord) => void;
}

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({
  initialStatusFilter = 'ALL',
  metrics,
  dataVersion = 0,
  onInvestigate,
  onExplainMoney,
  onApproveAction
}) => {
  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconBanner, setReconBanner] = useState<string | null>(null);

  const totalCount = metrics?.totalRecords ?? 0;
  const matchedCount = metrics?.matchedCount ?? 0;
  const exceptionCount = metrics?.exceptionCount ?? 0;
  const resolvedCount = metrics?.resolvedCount ?? 0;
  const humanReviewCount = metrics?.humanReviewCount ?? 0;
  const investigatingCount = metrics?.investigatingCount ?? 0;
  const unresolvedCount = metrics?.unresolvedCount ?? 0;
  const pendingVerification = humanReviewCount + investigatingCount + unresolvedCount;

  const handleRunFullReconciliation = async () => {
    setIsReconciling(true);
    try {
      const res = await apiFetch('/api/reconciliation/run', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setReconBanner(
          `Reconciliation engine executed successfully: ${data.summary.matchedRecords} matched, ${data.summary.discrepancies} active discrepancies verified across ${data.summary.totalRecords} records.`
        );
        await fetchRecords();
      }
    } catch (err: any) {
      console.error('Reconciliation run error:', err);
    } finally {
      setIsReconciling(false);
      setTimeout(() => setReconBanner(null), 7000);
    }
  };

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  const fetchRecords = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: statusFilter,
        search: searchQuery
      });
      const res = await apiFetch(`/api/reconciliation?${params.toString()}`, {
        headers: { Accept: 'application/json' }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setRecords(data.records || []);
        setTotalRecords(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        throw new Error(`Failed to load reconciliation records (Status: ${res.status})`);
      }
    } catch (err: any) {
      console.error('Failed to load records:', err);
      setFetchError(err.message || 'Unable to load records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, statusFilter, searchQuery, metrics, dataVersion]);

  const formatRupees = (amount: number) => {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  };

  const getStatusBadge = (rec: ReconciliationRecord) => {
    const effectiveStatus: RecordStatus =
      rec.issueStatus === 'RESOLVED' || rec.status === 'AI_RESOLVED' ? 'AI_RESOLVED' :
      rec.issueStatus === 'HUMAN_REVIEW' || rec.status === 'HUMAN_REVIEW' ? 'HUMAN_REVIEW' :
      rec.status;

    switch (effectiveStatus) {
      case 'MATCHED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200 font-mono">
            MATCHED
          </span>
        );
      case 'MISMATCH':
      case 'EXCEPTION':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-black text-white font-mono">
            EXCEPTION
          </span>
        );
      case 'AI_RESOLVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-300 font-mono">
            AI RESOLVED
          </span>
        );
      case 'HUMAN_REVIEW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-neutral-200 text-neutral-800 border border-neutral-300 font-mono">
            HUMAN REVIEW
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-neutral-900 text-white font-mono">
            INVESTIGATING
          </span>
        );
      case 'UNRESOLVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold bg-white text-neutral-700 border border-neutral-400 font-mono">
            UNRESOLVED
          </span>
        );
      default:
        return <span className="font-mono text-xs">{effectiveStatus}</span>;
    }
  };

  const filterTabs = [
    { id: 'ALL', label: 'All Records' },
    { id: 'EXCEPTION', label: 'Exceptions' },
    { id: 'MATCHED', label: 'Matched' },
    { id: 'AI_RESOLVED', label: 'AI Resolved' },
    { id: 'HUMAN_REVIEW', label: 'Human Review' },
    { id: 'INVESTIGATING', label: 'Investigating' },
    { id: 'UNRESOLVED', label: 'Unresolved' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 bg-black"></span>
            <h1 className="text-base font-bold text-[#111111] tracking-tight uppercase">Reconciliation</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs font-bold bg-neutral-100 text-neutral-700 border border-neutral-200 uppercase">
              Deterministic Multi-Ledger
            </span>
          </div>
          <p className="text-xs text-neutral-600">
            Compare customer orders, payment gateway captures, bank RRNs, and settlement records in real time.
          </p>
        </div>

        <button
          onClick={() => fetchRecords()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E5E0] hover:border-neutral-400 text-xs font-mono text-neutral-700 rounded-xs self-start sm:self-auto cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Box: Logically adds up and mathematically consistent */}
      <div className="bg-white border border-[#E5E5E0] rounded-xs p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-[#111111] uppercase tracking-wider text-[10px]">
            Reconciliation Overview: {totalCount} Records
          </span>
          <span className="text-neutral-500 text-[11px]">
            Identity Check: {matchedCount} Matched + {exceptionCount} Exceptions = {totalCount} | Exceptions: {resolvedCount} AI Resolved + {humanReviewCount} Human Review + {investigatingCount} Investigating + {unresolvedCount} Unresolved = {exceptionCount}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs font-mono">
          <button
            onClick={() => { setStatusFilter('ALL'); setPage(1); }}
            className={`p-2.5 rounded-xs border text-left transition-colors cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-black text-white border-black' : 'bg-[#F8F8F6] border-[#E5E5E0] text-neutral-800 hover:bg-neutral-100'
            }`}
          >
            <div className="text-[10px] text-neutral-500 uppercase">Total Records</div>
            <div className="text-base font-bold mt-0.5">{totalCount}</div>
          </button>

          <button
            onClick={() => { setStatusFilter('MATCHED'); setPage(1); }}
            className={`p-2.5 rounded-xs border text-left transition-colors cursor-pointer ${
              statusFilter === 'MATCHED' ? 'bg-black text-white border-black' : 'bg-[#F8F8F6] border-[#E5E5E0] text-neutral-800 hover:bg-neutral-100'
            }`}
          >
            <div className="text-[10px] text-neutral-500 uppercase">Matched</div>
            <div className="text-base font-bold mt-0.5">{matchedCount}</div>
          </button>

          <button
            onClick={() => { setStatusFilter('EXCEPTION'); setPage(1); }}
            className={`p-2.5 rounded-xs border text-left transition-colors cursor-pointer ${
              statusFilter === 'EXCEPTION' ? 'bg-black text-white border-black' : 'bg-[#F8F8F6] border-[#E5E5E0] text-neutral-800 hover:bg-neutral-100'
            }`}
          >
            <div className="text-[10px] text-neutral-500 uppercase">Exceptions</div>
            <div className="text-base font-bold mt-0.5">{exceptionCount}</div>
          </button>

          <button
            onClick={() => { setStatusFilter('AI_RESOLVED'); setPage(1); }}
            className={`p-2.5 rounded-xs border text-left transition-colors cursor-pointer ${
              statusFilter === 'AI_RESOLVED' ? 'bg-black text-white border-black' : 'bg-[#F8F8F6] border-[#E5E5E0] text-neutral-800 hover:bg-neutral-100'
            }`}
          >
            <div className="text-[10px] text-neutral-500 uppercase">AI Resolved</div>
            <div className="text-base font-bold mt-0.5">{resolvedCount}</div>
          </button>

          <button
            onClick={() => { setStatusFilter('HUMAN_REVIEW'); setPage(1); }}
            className={`p-2.5 rounded-xs border text-left transition-colors cursor-pointer ${
              statusFilter === 'HUMAN_REVIEW' ? 'bg-black text-white border-black' : 'bg-[#F8F8F6] border-[#E5E5E0] text-neutral-800 hover:bg-neutral-100'
            }`}
          >
            <div className="text-[10px] text-neutral-500 uppercase">Human Review</div>
            <div className="text-base font-bold mt-0.5">{humanReviewCount}</div>
          </button>

          <button
            onClick={() => { setStatusFilter('INVESTIGATING'); setPage(1); }}
            className={`p-2.5 rounded-xs border text-left transition-colors cursor-pointer ${
              statusFilter === 'INVESTIGATING' ? 'bg-black text-white border-black' : 'bg-[#F8F8F6] border-[#E5E5E0] text-neutral-800 hover:bg-neutral-100'
            }`}
          >
            <div className="text-[10px] text-neutral-500 uppercase">Investigating</div>
            <div className="text-base font-bold mt-0.5">{investigatingCount}</div>
          </button>

          <button
            onClick={() => { setStatusFilter('UNRESOLVED'); setPage(1); }}
            className={`p-2.5 rounded-xs border text-left transition-colors cursor-pointer ${
              statusFilter === 'UNRESOLVED' ? 'bg-black text-white border-black' : 'bg-[#F8F8F6] border-[#E5E5E0] text-neutral-800 hover:bg-neutral-100'
            }`}
          >
            <div className="text-[10px] text-neutral-500 uppercase">Unresolved</div>
            <div className="text-base font-bold mt-0.5">{unresolvedCount}</div>
          </button>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="bg-white p-4 border border-[#E5E5E0] rounded-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs font-medium pb-1 md:pb-0">
            {filterTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xs transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-black text-white font-medium'
                    : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              id="input-reconciliation-search"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search Payment, Order, or UTR..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F5F5F3] border border-[#E5E5E0] rounded-xs focus:outline-none focus:bg-white font-mono"
            />
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white border border-[#E5E5E0] rounded-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-mono text-neutral-500">
            <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full mx-auto mb-2"></div>
            <span>Matching payments across multi-gateway records...</span>
          </div>
        ) : fetchError ? (
          <div className="p-8 text-center text-xs font-mono text-neutral-800 bg-neutral-100">
            <p className="mb-2 font-bold">{fetchError}</p>
            <button
              onClick={() => fetchRecords()}
              className="px-3 py-1 bg-black text-white text-[10px] uppercase font-bold rounded-xs cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500 space-y-2 font-mono">
            <p>No reconciliation records matching current filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#F8F8F6] text-neutral-500 uppercase tracking-widest text-[10px] border-b border-[#E5E5E0]">
                <tr>
                  <th className="p-3 font-semibold">Payment ID</th>
                  <th className="p-3 font-semibold">Customer & Order</th>
                  <th className="p-3 font-semibold text-right">Expected</th>
                  <th className="p-3 font-semibold text-right">Received</th>
                  <th className="p-3 font-semibold text-right">Difference</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E0]">
                {records.map(rec => {
                  const hasProblem = rec.status !== 'MATCHED';
                  const diff = rec.difference || (rec.actualAmount - rec.expectedAmount);

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-neutral-50 transition-colors"
                    >
                      <td className="p-3">
                        <div className="font-bold text-[#111111]">{rec.id}</div>
                        <div className="text-[10px] text-neutral-500">{rec.paymentId}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-[#111111] font-sans font-medium">{rec.customerName}</div>
                        <div className="text-[10px] text-neutral-500">{rec.orderId}</div>
                      </td>
                      <td className="p-3 text-right text-neutral-600">
                        {formatRupees(rec.expectedAmount)}
                      </td>
                      <td className="p-3 text-right font-bold text-[#111111]">
                        {formatRupees(rec.actualAmount)}
                      </td>
                      <td className="p-3 text-right font-bold text-[#111111]">
                        {rec.status === 'AI_RESOLVED' || rec.issueStatus === 'RESOLVED'
                          ? '₹0'
                          : diff !== 0 ? formatRupees(Math.abs(diff)) : '₹0'}
                      </td>
                      <td className="p-3">
                        {getStatusBadge(rec)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onExplainMoney(rec.paymentId)}
                            className="px-2 py-1 bg-white border border-[#E5E5E0] hover:border-neutral-400 text-[10px] text-neutral-700 rounded-xs cursor-pointer transition-colors"
                            title="Trace payment lifecycle"
                          >
                            Trace
                          </button>

                          {hasProblem ? (
                            <button
                              onClick={() => onInvestigate(rec)}
                              className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white text-[10px] font-medium uppercase tracking-wider rounded-xs cursor-pointer transition-colors"
                            >
                              Investigate
                            </button>
                          ) : (
                            <button
                              onClick={() => onInvestigate(rec)}
                              className="px-2 py-1 bg-white border border-[#E5E5E0] hover:bg-neutral-100 text-[10px] text-neutral-600 rounded-xs cursor-pointer"
                            >
                              Details
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 bg-[#F8F8F6] border-t border-[#E5E5E0] flex items-center justify-between text-xs font-mono">
          <span className="text-neutral-500">
            Showing Page {page} of {totalPages} ({totalRecords} total transactions)
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
