import React, { useState, useEffect } from 'react';
import { TimelineNode, ReconciliationRecord } from '../types/index.js';
import { apiFetch } from '../services/clientTelemetry.js';
import {
  Search,
  ArrowDown,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Wrench,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  CheckCircle2
} from 'lucide-react';

interface ExplainMoneyProps {
  initialQuery?: string;
  onInvestigate: (record: ReconciliationRecord) => void;
}

export const ExplainMoneyView: React.FC<ExplainMoneyProps> = ({
  initialQuery = 'pay_80007',
  onInvestigate
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState<{
    customer?: any;
    order?: any;
    payment?: any;
    refund?: any;
    settlement?: any;
    events: any[];
    timeline: TimelineNode[];
    record?: ReconciliationRecord;
    narrativeExplanation: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAiDetails, setShowAiDetails] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  const fetchLifecycle = async (searchId: string) => {
    if (!searchId.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch(`/api/transactions/${encodeURIComponent(searchId.trim())}`, {
        headers: { Accept: 'application/json' }
      });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        let errMsg = `Payment or Order '${searchId}' not found`;
        if (contentType.includes('application/json')) {
          const err = await res.json();
          errMsg = err.error || errMsg;
        }
        throw new Error(errMsg);
      }
      if (contentType.includes('application/json')) {
        const json = await res.json();
        setData(json);
      } else {
        throw new Error(`Invalid response format from server`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error reconstructing payment journey');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      fetchLifecycle(initialQuery);
    }
  }, [initialQuery]);

  const sampleQueries = [
    { label: 'Duplicate Payment', id: 'pay_80007', tag: 'Double Charge' },
    { label: 'Settlement Mismatch', id: 'pay_80016', tag: '₹350 Variance' },
    { label: 'Delayed Settlement', id: 'pay_80025', tag: 'Latency Hold' },
    { label: 'Amount Shortfall', id: 'pay_80034', tag: 'Balance Underpay' },
    { label: 'Refund Mismatch', id: 'pay_80019', tag: 'Discrepancy' },
    { label: 'Clean Payment', id: 'pay_80043', tag: 'Fully Reconciled' }
  ];

  const quickQuestions = [
    { q: 'Where did the money go?', ans: 'The customer was charged via UPI, but the nodal settlement payout to the merchant bank account contained an unallocated variance.' },
    { q: 'Why was this flagged?', ans: 'Deterministic matching detected a numerical variance between the expected order balance and the nodal settlement credit.' },
    { q: 'Why wasn\'t this settled?', ans: 'The transaction is held in the exception queue pending automated adjustment under the predefined policy limit.' },
    { q: 'What did the AI do?', ans: 'AI traced all multi-gateway events, calculated the exact variance, and proposed a verified ledger correction.' }
  ];

  const formatRupees = (amount?: number) => {
    if (typeof amount !== 'number') return '₹0';
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  };

  // Determine where the journey broke
  const getBreakPoint = () => {
    if (!data?.record || data.record.status === 'MATCHED') return null;
    const type = data.record.exceptionType;
    if (type === 'DUPLICATE_PAYMENT') return 'Payment Attempt (Duplicate Capture)';
    if (type === 'SETTLEMENT_MISMATCH') return 'Settlement / Refund (Nodal Variance)';
    if (type === 'DELAYED_EVENT') return 'Event / Confirmation (Delayed Webhook)';
    if (type === 'PAYMENT_AMOUNT_MISMATCH') return 'Payment Attempt (Amount Underpaid)';
    return 'Settlement / Payout';
  };

  const breakPoint = getBreakPoint();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 bg-black"></span>
          <h1 className="text-base font-bold text-[#111111] tracking-tight uppercase">Explain This Money</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs font-bold bg-neutral-100 text-neutral-700 border border-neutral-200 uppercase">
            Financial Forensics
          </span>
        </div>
        <p className="text-xs text-neutral-600">
          Trace any payment, order, or transaction across customer initiation, gateway capture, and bank settlement.
        </p>
      </div>

      {/* Forensic Search Console */}
      <div className="bg-white border border-[#E5E5E0] rounded-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider font-mono">
            Search Identifier
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">Accepts: Payment ID, Order ID, or Transaction ID</span>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            fetchLifecycle(query);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              type="text"
              id="input-explain-money"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. pay_80007, order_10007, or REC-007..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F3] border border-[#E5E5E0] rounded-xs text-xs text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-black font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer transition-colors shrink-0"
          >
            Trace Journey
          </button>
        </form>

        {/* Quick Sample Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 text-[11px] font-mono">
          <span className="text-neutral-500 text-[10px] uppercase shrink-0">Sample Records:</span>
          {sampleQueries.map(sq => (
            <button
              key={sq.id}
              onClick={() => {
                setQuery(sq.id);
                fetchLifecycle(sq.id);
              }}
              className={`px-2.5 py-1 rounded-xs border transition-colors cursor-pointer whitespace-nowrap ${
                query === sq.id
                  ? 'bg-black text-white font-bold border-black'
                  : 'bg-[#F8F8F6] border-[#E5E5E0] text-neutral-700 hover:bg-neutral-100 hover:text-black'
              }`}
            >
              <span>{sq.label}</span>
              <span className="text-[9px] opacity-60 ml-1.5 font-normal">({sq.id})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="p-12 text-center bg-white border border-[#E5E5E0] rounded-xs space-y-3">
          <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full mx-auto"></div>
          <div className="text-xs font-mono text-neutral-500">
            Reconstructing multi-ledger lifecycle graph...
          </div>
        </div>
      )}

      {errorMessage && !isLoading && (
        <div className="p-6 bg-white border border-neutral-300 rounded-xs text-center space-y-2">
          <AlertTriangle className="w-5 h-5 text-neutral-700 mx-auto" />
          <h3 className="text-xs font-bold text-[#111111]">Record Not Found</h3>
          <p className="text-xs text-neutral-500 font-mono">{errorMessage}</p>
        </div>
      )}

      {/* Results View */}
      {data && !isLoading && (
        <div className="space-y-6">
          {/* Main Card */}
          <div className="bg-white border border-[#E5E5E0] rounded-xs p-6 space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E5E0]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase">Financial Forensic Record</span>
                  <span className="font-mono text-xs font-bold text-[#111111]">{data.payment?.id || query}</span>
                </div>
                <h2 className="text-sm font-bold text-[#111111]">
                  Customer: {data.customer?.name || 'Enterprise Customer'} ({data.customer?.email || 'verified'})
                </h2>
              </div>

              {data.record && (
                <button
                  onClick={() => onInvestigate(data.record!)}
                  className="px-4 py-2 bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Investigate & Resolve</span>
                </button>
              )}
            </div>

            {/* Money Journey: Chronological Flow */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold">
                  The Money Journey
                </span>
                {breakPoint && (
                  <span className="text-[10px] font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-xs border border-neutral-300">
                    Broken at: {breakPoint}
                  </span>
                )}
              </div>

              {/* Vertical / Step Journey */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {[
                  {
                    stage: 'Order Created',
                    desc: `Order ${data.order?.id || 'Ref'}`,
                    amount: formatRupees(data.order?.amount),
                    status: 'OK'
                  },
                  {
                    stage: 'Payment Attempt',
                    desc: data.payment?.method?.toUpperCase() || 'UPI',
                    amount: formatRupees(data.payment?.amount),
                    status: data.payment?.isDuplicate || data.record?.exceptionType === 'DUPLICATE_PAYMENT' ? 'BROKEN' : 'OK'
                  },
                  {
                    stage: 'Event / Confirmation',
                    desc: `${data.events?.length || 2} Webhook events`,
                    amount: 'Captured',
                    status: data.record?.exceptionType === 'DELAYED_EVENT' ? 'BROKEN' : 'OK'
                  },
                  {
                    stage: 'Settlement / Refund',
                    desc: data.settlement?.utr ? `UTR: ${data.settlement.utr}` : 'Batch pending',
                    amount: data.settlement?.netSettled ? formatRupees(data.settlement.netSettled) : 'Pending',
                    status: data.record?.exceptionType === 'SETTLEMENT_MISMATCH' || data.record?.exceptionType === 'REFUND_MISMATCH' ? 'BROKEN' : 'OK'
                  },
                  {
                    stage: 'Final State',
                    desc: data.record?.status === 'MATCHED' ? 'Balanced' : (data.record?.status === 'AI_RESOLVED' ? 'AI Resolved' : 'Exception Held'),
                    amount: data.record?.status === 'MATCHED' ? 'Zero Variance' : formatRupees(data.record?.difference || 0),
                    status: data.record?.status === 'MATCHED' || data.record?.status === 'AI_RESOLVED' ? 'OK' : 'BROKEN'
                  }
                ].map((step, idx) => {
                  const isBroken = step.status === 'BROKEN';
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xs border text-xs font-mono space-y-1.5 transition-all ${
                        isBroken
                          ? 'bg-neutral-100 border-black ring-1 ring-black text-neutral-900'
                          : 'bg-[#F8F8F6] border-[#E5E5E0] text-neutral-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold uppercase text-neutral-500">{idx + 1}. {step.stage}</span>
                        {isBroken ? (
                          <span className="font-bold text-neutral-900">BROKE HERE</span>
                        ) : (
                          <span className="text-neutral-400">✓</span>
                        )}
                      </div>
                      <div className="text-[12px] font-bold text-[#111111]">{step.amount}</div>
                      <div className="text-[10px] text-neutral-500 truncate">{step.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Where the financial story broke (highlighted banner if broken) */}
            {breakPoint && (
              <div className="p-4 bg-[#F8F8F6] border border-black rounded-xs space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-[#111111] font-mono">
                  <span className="w-2 h-2 rounded-full bg-black"></span>
                  <span>Where the financial story broke</span>
                </div>
                <p className="text-xs text-neutral-700 font-sans pl-4">
                  Discrepancy occurred at <strong className="font-semibold text-black">{breakPoint}</strong>.
                  {' '}
                  {data.record?.exceptionType === 'DUPLICATE_PAYMENT'
                    ? 'The customer payment gateway sent two capture confirmations for a single order intent.'
                    : data.record?.exceptionType === 'SETTLEMENT_MISMATCH'
                    ? 'The nodal bank settlement calculation differed from the gateway fee capture schedule.'
                    : data.record?.exceptionType === 'DELAYED_EVENT'
                    ? 'Gateway confirmation event arrived after the settlement cut-off window.'
                    : data.record?.exceptionType === 'PAYMENT_AMOUNT_MISMATCH'
                    ? 'Captured amount is less than the order balance invoice amount.'
                    : 'Discrepancy detected during ledger cross-reconciliation.'}
                </p>
              </div>
            )}

            {/* 3 Plain-English Summary Cards */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold">
                Plain-English Summary
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Card 1: What Happened */}
                <div className="p-4 bg-white border border-[#E5E5E0] rounded-xs space-y-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-neutral-500 block">
                    What Happened
                  </span>
                  <p className="text-xs text-[#111111] font-sans leading-relaxed">
                    {data.record?.exceptionType === 'DUPLICATE_PAYMENT'
                      ? 'Two payments were charged for the same customer order.'
                      : data.record?.exceptionType === 'SETTLEMENT_MISMATCH'
                      ? 'The bank payout had a variance against the expected Razorpay settlement amount.'
                      : data.record?.exceptionType === 'DELAYED_EVENT'
                      ? 'Settlement payout exceeded normal latency threshold without bank failure webhook.'
                      : data.record?.exceptionType === 'PAYMENT_AMOUNT_MISMATCH'
                      ? 'Amount debited and captured was less than the order balance.'
                      : data.narrativeExplanation || 'Payment transaction successfully processed across all records.'}
                  </p>
                </div>

                {/* Card 2: Why */}
                <div className="p-4 bg-white border border-[#E5E5E0] rounded-xs space-y-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-neutral-500 block">
                    Why
                  </span>
                  <p className="text-xs text-neutral-700 font-sans leading-relaxed">
                    {data.record?.exceptionType === 'DUPLICATE_PAYMENT'
                      ? 'A delayed confirmation webhook led the customer to retry, generating two successful captures.'
                      : data.record?.exceptionType === 'SETTLEMENT_MISMATCH'
                      ? 'Nodal interchange deduction was miscalculated by the acquiring switch during batch settlement.'
                      : data.record?.exceptionType === 'DELAYED_EVENT'
                      ? 'Clearing house UTR dispatch was delayed during holiday batch processing.'
                      : data.record?.exceptionType === 'PAYMENT_AMOUNT_MISMATCH'
                      ? 'Promotional coupon code was applied without updating the ledger balance.'
                      : 'All multi-party ledgers match with zero discrepancy.'}
                  </p>
                </div>

                {/* Card 3: Recommended Next Step */}
                <div className="p-4 bg-white border border-[#E5E5E0] rounded-xs space-y-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-neutral-500 block">
                    Recommended Next Step
                  </span>
                  <p className="text-xs text-neutral-800 font-sans leading-relaxed">
                    {data.record?.exceptionType === 'DUPLICATE_PAYMENT'
                      ? 'Issue automated refund reversal for the second payment back to customer source VPA.'
                      : data.record?.exceptionType === 'SETTLEMENT_MISMATCH'
                      ? 'Apply automated nodal settlement variance adjustment to the fee ledger.'
                      : data.record?.exceptionType === 'DELAYED_EVENT'
                      ? 'Send automated settlement inquiry to nodal bank operations desk with UTR.'
                      : data.record?.exceptionType === 'PAYMENT_AMOUNT_MISMATCH'
                      ? 'Issue merchant balance adjustment notice for the remaining shortfall.'
                      : 'No corrective action needed. Ledgers are balanced.'}
                  </p>
                  {data.record && (
                    <button
                      onClick={() => onInvestigate(data.record!)}
                      className="mt-2 text-[10px] font-mono text-black font-bold uppercase hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Execute Action</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Questions Interactive Box */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold">
                Financial Questions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveQuestion(activeQuestion === q.q ? null : q.q)}
                    className="p-3 bg-white border border-[#E5E5E0] hover:border-neutral-400 rounded-xs text-left cursor-pointer transition-colors"
                  >
                    <div className="font-bold text-[#111111] flex items-center justify-between">
                      <span>"{q.q}"</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${activeQuestion === q.q ? 'rotate-180' : ''}`} />
                    </div>
                    {activeQuestion === q.q && (
                      <p className="mt-2 text-[11px] text-neutral-600 font-mono bg-[#F8F8F6] p-2 rounded-xs border border-[#E5E5E0] leading-relaxed">
                        {q.ans}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Expandable Technical AI Details */}
            <div className="border-t border-[#E5E5E0] pt-4">
              <button
                onClick={() => setShowAiDetails(!showAiDetails)}
                className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-600 hover:text-black cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5 text-neutral-500" />
                <span>{showAiDetails ? 'Hide Technical Multi-Ledger Graph' : 'Show Technical Multi-Ledger Graph'}</span>
                {showAiDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAiDetails && (
                <div className="mt-3 p-4 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xs font-mono text-xs space-y-2">
                  <div className="text-neutral-500 text-[10px] uppercase font-bold">
                    Multi-Entity State Graph
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-800">
                    <div>Order Ref: {data.order?.id || 'N/A'}</div>
                    <div>Payment Ref: {data.payment?.id || 'N/A'}</div>
                    <div>Settlement UTR: {data.settlement?.utr || 'N/A'}</div>
                    <div>Captured Events: {data.events?.length || 0} Webhooks</div>
                  </div>
                  <p className="text-[11px] text-neutral-500 pt-1 border-t border-[#E5E5E0]">
                    Deterministic verification evaluated invariants across 4 distinct financial tables (orders, payments, refunds, settlements) with zero data loss.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
