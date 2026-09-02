import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/clientTelemetry.js';
import {
  Search,
  SearchCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface TransactionsViewProps {
  onExplainMoney: (id: string) => void;
  onInvestigateRecord?: (record: any) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onExplainMoney,
  onInvestigateRecord
}) => {
  const [records, setRecords] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search: search.trim()
      });
      const res = await apiFetch(`/api/reconciliation?${params.toString()}`, {
        headers: { Accept: 'application/json' }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setRecords(data.records || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      } else {
        throw new Error(`Failed to load transactions (Status: ${res.status})`);
      }
    } catch (err: any) {
      console.error('Failed to load transaction records:', err);
      setFetchError(err.message || 'Unable to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, search]);

  const formatRupees = (amount?: number) => {
    if (typeof amount !== 'number') return '₹0';
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 bg-black"></span>
            <h1 className="text-base font-bold text-[#111111] tracking-tight uppercase">Transactions</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs font-bold bg-neutral-100 text-neutral-700 border border-neutral-200 uppercase">
              Multi-Entity Ledger
            </span>
          </div>
          <p className="text-xs text-neutral-600">
            Multi-table ledger tracking payment authorizations, customer orders, gateway events, and bank settlements.
          </p>
        </div>

        <button
          onClick={() => fetchTransactions()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E5E0] hover:border-neutral-400 text-xs font-mono text-neutral-700 rounded-xs self-start sm:self-auto cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-3.5 border border-[#E5E5E0] rounded-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="text-xs font-mono text-neutral-500">
          Showing <strong className="text-[#111111]">{totalCount}</strong> transactions monitored
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Transaction ID, Order ID..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-8 pr-3 py-1.5 bg-[#F5F5F3] border border-[#E5E5E0] rounded-xs text-xs text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-black font-mono"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-[#E5E5E0] rounded-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#F8F8F6] border-b border-[#E5E5E0] text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                <th className="py-3 px-3.5">Transaction ID</th>
                <th className="py-3 px-3.5">Order ID</th>
                <th className="py-3 px-3.5 text-right">Amount</th>
                <th className="py-3 px-3.5 text-center">Payment Status</th>
                <th className="py-3 px-3.5 text-center">Settlement Status</th>
                <th className="py-3 px-3.5 text-center">Reconciliation Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E0]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-neutral-500">
                    <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full mx-auto mb-2"></div>
                    <span>Loading multi-ledger records...</span>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-800 bg-neutral-100">
                    <p className="mb-2">⚠️ {fetchError}</p>
                    <button
                      onClick={() => fetchTransactions()}
                      className="px-3 py-1 bg-black text-white text-[10px] uppercase font-bold rounded-xs cursor-pointer"
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    No transactions matching criteria.
                  </td>
                </tr>
              ) : (
                records.map(r => {
                  const isMatched = r.status === 'MATCHED';
                  const paymentStatus = r.actualAmount > 0 ? 'CAPTURED' : 'PENDING';
                  const settlementStatus = r.settlementId ? 'SETTLED' : (isMatched ? 'SCHEDULED' : 'HOLD / VARIANCE');

                  return (
                    <tr
                      key={r.id}
                      onClick={() => onExplainMoney(r.paymentId || r.id)}
                      className="hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3.5 font-bold text-[#111111]">
                        {r.paymentId || r.id}
                      </td>
                      <td className="py-3 px-3.5 text-neutral-600">
                        {r.orderId}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-[#111111]">
                        {formatRupees(r.actualAmount || r.expectedAmount)}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                          {paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold border ${
                          settlementStatus === 'SETTLED'
                            ? 'bg-neutral-100 text-neutral-800 border-neutral-200'
                            : 'bg-neutral-200 text-neutral-800 border-neutral-300'
                        }`}>
                          {settlementStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold ${
                          isMatched
                            ? 'bg-neutral-100 text-neutral-800 border border-neutral-200'
                            : 'bg-black text-white'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => onExplainMoney(r.paymentId || r.id)}
                            className="px-2 py-1 bg-white border border-[#E5E5E0] hover:border-neutral-400 text-[10px] text-neutral-700 rounded-xs cursor-pointer transition-colors"
                            title="Trace money story"
                          >
                            Trace
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
        <div className="p-4 bg-[#F8F8F6] border-t border-[#E5E5E0] flex items-center justify-between text-xs font-mono">
          <span className="text-neutral-500">
            Page {page} of {totalPages} ({totalCount} total transactions)
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
