import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/clientTelemetry.js';
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw
} from 'lucide-react';

interface TransactionsViewProps {
  onExplainMoney: (id: string) => void;
  onInvestigateRecordId?: (recordId: string) => void;
  dataVersion?: number;
}

interface TransactionItem {
  id: string;
  orderId: string;
  recordId?: string;
  customerName: string;
  customerEmail?: string;
  method: string;
  methodDetails?: string;
  amount: number;
  fee?: number;
  tax?: number;
  netAmount?: number;
  currency: string;
  paymentStatus: string;
  settlementStatus: string;
  settlementUtr?: string;
  reconciliationStatus: string;
  createdAt: string;
  isDuplicate?: boolean;
}

type FilterOption = 'ALL' | 'CAPTURED' | 'FAILED' | 'REFUNDED' | 'SETTLEMENT_PENDING' | 'EXCEPTION';

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onExplainMoney,
  onInvestigateRecordId,
  dataVersion = 0
}) => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        filter: activeFilter,
        search: search.trim()
      });
      const res = await apiFetch(`/api/transactions?${params.toString()}`, {
        headers: { Accept: 'application/json' }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(typeof data.total === 'number' ? data.total : 0);
        setTotalAll(typeof data.totalAll === 'number' ? data.totalAll : (typeof data.total === 'number' ? data.total : 0));
      } else {
        throw new Error(`Failed to load transactions (Status: ${res.status})`);
      }
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
      setFetchError(err.message || 'Unable to load transaction records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, activeFilter, search, dataVersion]);

  const formatRupees = (amount?: number) => {
    if (typeof amount !== 'number') return '₹0';
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const filterTabs: { id: FilterOption; label: string }[] = [
    { id: 'ALL', label: 'All Transactions' },
    { id: 'CAPTURED', label: 'Captured' },
    { id: 'FAILED', label: 'Failed' },
    { id: 'REFUNDED', label: 'Refunded' },
    { id: 'SETTLEMENT_PENDING', label: 'Settlement Pending' },
    { id: 'EXCEPTION', label: 'Exceptions' }
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 bg-black"></span>
            <h1 className="text-base font-bold text-[#111111] tracking-tight uppercase">Transactions Ledger</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs font-bold bg-neutral-100 text-neutral-800 border border-neutral-300 uppercase">
              Live Gateway Feed
            </span>
          </div>
          <p className="text-xs text-neutral-600">
            Real-time multi-table transaction ledger spanning payment captures, order intents, gateway fees, and nodal bank settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTransactions()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E5E0] hover:border-neutral-400 text-xs font-mono text-neutral-700 rounded-xs cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Filter Tabs + Search */}
      <div className="bg-white border border-[#E5E5E0] rounded-xs p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-[#F5F5F3] p-1 rounded-xs border border-[#E5E5E0]">
            {filterTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveFilter(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1 text-xs font-mono rounded-xs transition-colors cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-black text-white font-bold'
                    : 'text-neutral-600 hover:text-black hover:bg-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Payment ID, Order ID, Customer..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 bg-[#F5F5F3] border border-[#E5E5E0] rounded-xs text-xs text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-black font-mono transition-colors"
            />
          </div>
        </div>

        <div className="text-xs font-mono text-neutral-500 flex items-center justify-between">
          <span>
            Showing <strong className="text-[#111111]">{totalCount}</strong> of{' '}
            <strong className="text-[#111111]">{totalAll}</strong> monitored transactions
          </span>
          <span className="text-[11px] text-neutral-400">
            Click any row to view complete money trace
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-[#E5E5E0] rounded-xs overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#F8F8F6] border-b border-[#E5E5E0] text-[10px] font-semibold text-neutral-600 uppercase tracking-wider">
                <th className="py-3 px-3.5">Payment ID</th>
                <th className="py-3 px-3.5">Order ID</th>
                <th className="py-3 px-3.5">Customer</th>
                <th className="py-3 px-3.5 text-right">Amount</th>
                <th className="py-3 px-3.5 text-center">Method</th>
                <th className="py-3 px-3.5 text-center">Payment Status</th>
                <th className="py-3 px-3.5 text-center">Settlement Status</th>
                <th className="py-3 px-3.5 text-center">Reconciliation</th>
                <th className="py-3 px-3.5">Created At</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E0]">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-neutral-500">
                    <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full mx-auto mb-2"></div>
                    <span>Streaming live transaction feed...</span>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-neutral-800 bg-neutral-100">
                    <p className="mb-2">⚠️ {fetchError}</p>
                    <button
                      onClick={() => fetchTransactions()}
                      className="px-3 py-1 bg-black text-white text-[10px] uppercase font-bold rounded-xs cursor-pointer"
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-neutral-500">
                    <p className="font-medium text-neutral-700">No transactions match the selected filter.</p>
                    <p className="text-[11px] text-neutral-400 mt-1">Try switching to &quot;All Transactions&quot; or clearing the search query.</p>
                  </td>
                </tr>
              ) : (
                transactions.map(tx => {
                  const isException = tx.reconciliationStatus === 'EXCEPTION' || tx.reconciliationStatus === 'MISMATCH';
                  const isResolved = tx.reconciliationStatus === 'RESOLVED';

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => onExplainMoney(tx.id)}
                      className="hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      {/* Payment ID */}
                      <td className="py-3 px-3.5 font-bold text-[#111111] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{tx.id}</span>
                          {tx.isDuplicate && (
                            <span className="text-[9px] px-1 py-0.2 rounded-xs bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                              DUP
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Order ID */}
                      <td className="py-3 px-3.5 text-neutral-600 whitespace-nowrap">
                        {tx.orderId}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3.5 text-neutral-800 max-w-[140px] truncate" title={tx.customerName}>
                        {tx.customerName}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3.5 text-right font-bold text-[#111111] whitespace-nowrap">
                        {formatRupees(tx.amount)}
                      </td>

                      {/* Method */}
                      <td className="py-3 px-3.5 text-center text-[10px] text-neutral-600 uppercase whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded-xs bg-neutral-100 border border-neutral-200">
                          {tx.method}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase border ${
                            tx.paymentStatus === 'CAPTURED'
                              ? 'bg-neutral-100 text-neutral-800 border-neutral-300'
                              : tx.paymentStatus === 'REFUNDED'
                              ? 'bg-neutral-200 text-neutral-800 border-neutral-300'
                              : 'bg-neutral-800 text-white border-neutral-800'
                          }`}
                        >
                          {tx.paymentStatus}
                        </span>
                      </td>

                      {/* Settlement Status */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase border ${
                            tx.settlementStatus === 'SETTLED'
                              ? 'bg-neutral-100 text-neutral-800 border-neutral-300'
                              : 'bg-neutral-200 text-neutral-800 border-neutral-300'
                          }`}
                          title={tx.settlementUtr ? `UTR: ${tx.settlementUtr}` : undefined}
                        >
                          {tx.settlementStatus}
                        </span>
                      </td>

                      {/* Reconciliation Status */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase ${
                            isResolved
                              ? 'bg-neutral-200 text-neutral-800 border border-neutral-300'
                              : isException
                              ? 'bg-black text-white'
                              : 'bg-neutral-100 text-neutral-800 border border-neutral-300'
                          }`}
                        >
                          {tx.reconciliationStatus}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-3.5 text-neutral-500 text-[11px] whitespace-nowrap">
                        {formatDate(tx.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={e => e.stopPropagation()}
                        >
                          {isException && tx.recordId && onInvestigateRecordId && (
                            <button
                              onClick={() => onInvestigateRecordId(tx.recordId!)}
                              className="px-2 py-1 bg-black text-white text-[10px] font-bold rounded-xs hover:bg-neutral-800 cursor-pointer transition-colors"
                              title="Investigate discrepancy"
                            >
                              Investigate
                            </button>
                          )}
                          <button
                            onClick={() => onExplainMoney(tx.id)}
                            className="px-2 py-1 bg-white border border-[#E5E5E0] hover:border-neutral-400 text-[10px] text-neutral-700 rounded-xs cursor-pointer transition-colors"
                            title="Trace complete money lifecycle"
                          >
                            Explain This Money
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3.5 bg-[#F8F8F6] border-t border-[#E5E5E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <span className="text-neutral-600">
            Page <strong className="text-black">{page}</strong> of <strong className="text-black">{totalPages}</strong>
            {' '}(Showing {totalCount} of {totalAll} transactions monitored)
          </span>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 bg-white border border-[#E5E5E0] text-neutral-700 hover:border-black disabled:opacity-30 rounded-xs cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1 bg-white border border-[#E5E5E0] text-neutral-700 hover:border-black disabled:opacity-30 rounded-xs cursor-pointer flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
