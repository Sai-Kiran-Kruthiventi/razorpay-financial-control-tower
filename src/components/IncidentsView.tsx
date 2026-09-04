import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/clientTelemetry.js';
import {
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  HelpCircle,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Cpu,
  Clock,
  Filter
} from 'lucide-react';

interface IssueItem {
  id: string;
  recordId: string;
  issueType: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  customerName?: string;
  affectedAmount: number;
  difference?: number;
  confidence: number;
  relatedIds: {
    orderId: string;
    paymentId: string;
    refundId?: string;
    settlementId?: string;
    customerId?: string;
  };
  status: 'OPEN' | 'INVESTIGATING' | 'HUMAN_REVIEW' | 'RESOLVED' | 'DETECTED';
  rootCause: string;
  evidence: string[];
  policyCheck: {
    passed: boolean;
    policyName: string;
    reason: string;
    thresholdAmount: number;
  };
  recommendedAction: {
    id: string;
    type: string;
    label: string;
    description: string;
    autoExecutable: boolean;
  };
  createdTime?: string;
  resolvedAt?: string;
  actionTaken?: string;
}

interface IssueCounts {
  total: number;
  open: number;
  humanReview: number;
  resolved: number;
  highSeverity: number;
}

interface IncidentsViewProps {
  onInvestigateRecordId: (recordId: string) => void;
  onExplainMoney: (paymentId: string) => void;
  dataVersion?: number;
}

type FilterTab = 'ALL' | 'OPEN' | 'HUMAN_REVIEW' | 'HIGH_SEVERITY' | 'RESOLVED';

export const IncidentsView: React.FC<IncidentsViewProps> = ({
  onInvestigateRecordId,
  onExplainMoney,
  dataVersion = 0
}) => {
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [counts, setCounts] = useState<IssueCounts>({
    total: 0,
    open: 0,
    humanReview: 0,
    resolved: 0,
    highSeverity: 0
  });
  const [selectedIssue, setSelectedIssue] = useState<IssueItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('OPEN');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchIssues = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        filter: activeFilter,
        search: search.trim()
      });
      const res = await apiFetch(`/api/issues?${params.toString()}`, {
        headers: { Accept: 'application/json' }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const list: IssueItem[] = data.issues || [];
        setIssues(list);
        if (data.counts) {
          setCounts(data.counts);
        }
        if (list.length > 0) {
          // Keep selected if still in list, else pick first
          setSelectedIssue(prev => {
            if (prev) {
              const found = list.find(i => i.id === prev.id);
              if (found) return found;
            }
            return list[0];
          });
        } else {
          setSelectedIssue(null);
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
    fetchIssues();
  }, [activeFilter, search, dataVersion]);

  const formatRupees = (amount?: number) => {
    if (typeof amount !== 'number') return '₹0';
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  };

  const formatIssueType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold uppercase tracking-wider bg-black text-white">
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold uppercase tracking-wider bg-neutral-200 text-neutral-900 border border-neutral-300">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold uppercase tracking-wider bg-neutral-100 text-neutral-800 border border-neutral-300">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 border border-neutral-200">
            LOW
          </span>
        );
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'RESOLVED':
        return (
          <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold uppercase bg-neutral-100 text-neutral-800 border border-neutral-300">
            RESOLVED
          </span>
        );
      case 'HUMAN_REVIEW':
        return (
          <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold uppercase bg-neutral-200 text-neutral-900 border border-neutral-400">
            HUMAN REVIEW
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold uppercase bg-neutral-100 text-neutral-700 border border-neutral-300">
            INVESTIGATING
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold uppercase bg-black text-white">
            OPEN
          </span>
        );
    }
  };

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'OPEN', label: 'Open Issues', count: counts.open },
    { id: 'HUMAN_REVIEW', label: 'Requires Human Approval', count: counts.humanReview },
    { id: 'HIGH_SEVERITY', label: 'High Severity (> ₹5,000)', count: counts.highSeverity },
    { id: 'RESOLVED', label: 'Resolved', count: counts.resolved },
    { id: 'ALL', label: 'All Issues', count: counts.total }
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 bg-black"></span>
            <h1 className="text-base font-bold text-[#111111] tracking-tight uppercase">Exception & Anomaly Console</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs font-bold bg-neutral-100 text-neutral-800 border border-neutral-300 uppercase">
              Deterministic Invariant Verification
            </span>
          </div>
          <p className="text-xs text-neutral-600">
            Central ledger anomalies detected across payment captures, webhook delivery queues, fee deductions, and nodal bank statements.
          </p>
        </div>

        <button
          onClick={() => fetchIssues()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E5E0] hover:border-neutral-400 text-xs font-mono text-neutral-700 rounded-xs self-start sm:self-auto cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Control Bar: Filter Tabs + Search */}
      <div className="bg-white border border-[#E5E5E0] rounded-xs p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-[#F5F5F3] p-1 rounded-xs border border-[#E5E5E0]">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1 text-xs font-mono rounded-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === tab.id
                    ? 'bg-black text-white font-bold'
                    : 'text-neutral-600 hover:text-black hover:bg-neutral-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-xs font-mono ${
                    activeFilter === tab.id
                      ? 'bg-neutral-800 text-white'
                      : 'bg-neutral-200 text-neutral-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Issue ID, Payment, Order..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#F5F5F3] border border-[#E5E5E0] rounded-xs text-xs text-[#111111] placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-black font-mono transition-colors"
            />
          </div>
        </div>

        <div className="text-xs font-mono text-neutral-500 flex items-center justify-between">
          <span>
            Displaying <strong className="text-[#111111]">{issues.length}</strong> matching issues
          </span>
          <span className="text-[11px] text-neutral-400">
            Select any issue to view automated investigation &amp; policy evidence
          </span>
        </div>
      </div>

      {/* Main Split Layout: List (5 cols) + Detail Panel (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Issues List */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-2.5">
          {isLoading ? (
            <div className="p-12 text-center text-neutral-500 text-xs font-mono bg-white border border-[#E5E5E0] rounded-xs">
              <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full mx-auto mb-2"></div>
              <span>Scanning ledger discrepancies...</span>
            </div>
          ) : fetchError ? (
            <div className="p-8 text-center text-neutral-800 text-xs font-mono bg-white border border-neutral-300 rounded-xs">
              <p className="mb-2 font-bold">⚠️ {fetchError}</p>
              <button
                onClick={() => fetchIssues()}
                className="px-3 py-1 bg-black text-white text-[10px] uppercase font-bold rounded-xs cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : issues.length === 0 ? (
            <div className="p-10 text-center bg-white border border-[#E5E5E0] rounded-xs space-y-2">
              <CheckCircle2 className="w-7 h-7 text-neutral-800 mx-auto mb-2" />
              <h3 className="text-xs font-bold text-[#111111] uppercase font-mono">No issues match this view</h3>
              <p className="text-xs text-neutral-500">
                All transactions in this category are completely reconciled with ₹0 variance.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
              {issues.map(item => {
                const isSelected = selectedIssue?.id === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedIssue(item)}
                    className={`p-3.5 rounded-xs border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-neutral-50 border-black ring-1 ring-black'
                        : 'bg-white border-[#E5E5E0] hover:border-neutral-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-black font-mono">{item.id}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">({item.recordId})</span>
                        </div>
                        <h3 className="text-xs font-bold text-[#111111] mt-0.5">
                          {formatIssueType(item.issueType)}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {getSeverityBadge(item.severity)}
                        {getStatusBadge(item.status)}
                      </div>
                    </div>

                    <div className="text-[11px] text-neutral-600 font-sans line-clamp-1 mb-2">
                      {item.rootCause}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E0] text-[10px] font-mono">
                      <div className="text-neutral-500 truncate max-w-[180px]">
                        Pay: <span className="font-bold text-neutral-800">{item.relatedIds.paymentId}</span>
                        {item.customerName ? ` • ${item.customerName}` : ''}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#111111] text-xs">
                          {formatRupees(item.affectedAmount)}
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'translate-x-0.5 text-black' : 'text-neutral-400'}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Issue Detail Panel */}
        <div className="lg:col-span-6 xl:col-span-7">
          {selectedIssue ? (
            <div className="bg-white border border-[#E5E5E0] rounded-xs p-5 sm:p-6 space-y-5 sticky top-4">
              {/* Header Info */}
              <div className="pb-4 border-b border-[#E5E5E0] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#111111]">
                      {selectedIssue.id}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-neutral-100 text-neutral-700 font-bold border border-neutral-200">
                      Record: {selectedIssue.recordId}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {getSeverityBadge(selectedIssue.severity)}
                    {getStatusBadge(selectedIssue.status)}
                  </div>
                </div>

                <h2 className="text-base sm:text-lg font-bold text-[#111111] leading-tight">
                  {formatIssueType(selectedIssue.issueType)}
                </h2>

                {/* Metric Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs font-mono">
                  <div className="p-2.5 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xs">
                    <span className="text-[10px] text-neutral-500 uppercase block font-medium">Amount at Risk</span>
                    <strong className="text-sm text-[#111111] font-bold block mt-0.5">
                      {formatRupees(selectedIssue.affectedAmount)}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xs">
                    <span className="text-[10px] text-neutral-500 uppercase block font-medium">Payment ID</span>
                    <strong className="text-xs text-[#111111] font-bold block mt-0.5 truncate" title={selectedIssue.relatedIds.paymentId}>
                      {selectedIssue.relatedIds.paymentId}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xs">
                    <span className="text-[10px] text-neutral-500 uppercase block font-medium">Order ID</span>
                    <strong className="text-xs text-[#111111] font-bold block mt-0.5 truncate" title={selectedIssue.relatedIds.orderId}>
                      {selectedIssue.relatedIds.orderId}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xs">
                    <span className="text-[10px] text-neutral-500 uppercase block font-medium">AI Confidence</span>
                    <strong className="text-xs text-[#111111] font-bold block mt-0.5">
                      {Math.round(selectedIssue.confidence * 100)}% Verified
                    </strong>
                  </div>
                </div>
              </div>

              {/* Why This Happened / Root Cause */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#111111] uppercase font-mono">
                  <HelpCircle className="w-3.5 h-3.5 text-neutral-700" />
                  <span>Why This Happened (Root Cause)</span>
                </div>
                <div className="p-3.5 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xs text-xs text-neutral-800 leading-relaxed font-sans">
                  {selectedIssue.rootCause}
                </div>
              </div>

              {/* Evidence & Invariants */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#111111] uppercase font-mono">
                    <Layers className="w-3.5 h-3.5 text-neutral-700" />
                    <span>Evidence &amp; Ledger Invariants</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">Multi-table verify</span>
                </div>
                <div className="space-y-1">
                  {selectedIssue.evidence.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xs text-xs font-mono text-neutral-800 flex items-center justify-between"
                    >
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety Policy Check */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#111111] uppercase font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-neutral-700" />
                  <span>Safety Policy Check</span>
                </div>
                <div className="p-3 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xs text-xs font-mono flex items-start justify-between gap-3">
                  <div>
                    <span className="font-bold text-[#111111]">{selectedIssue.policyCheck.policyName}: </span>
                    <span className="text-neutral-700">{selectedIssue.policyCheck.reason}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase shrink-0 ${
                      selectedIssue.policyCheck.passed
                        ? 'bg-neutral-100 text-neutral-800 border border-neutral-300'
                        : 'bg-black text-white'
                    }`}
                  >
                    {selectedIssue.policyCheck.passed ? 'Auto Allowed (≤ ₹5k)' : 'Human Approval Req (> ₹5k)'}
                  </span>
                </div>
              </div>

              {/* Recommended Action */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#111111] uppercase font-mono">
                  <Cpu className="w-3.5 h-3.5 text-neutral-700" />
                  <span>Recommended Action</span>
                </div>
                <div className="p-3.5 bg-neutral-50 border border-neutral-300 rounded-xs space-y-1 text-xs">
                  <div className="font-bold text-[#111111] font-mono">
                    {selectedIssue.recommendedAction.label}
                  </div>
                  <p className="text-neutral-600 font-sans">
                    {selectedIssue.recommendedAction.description}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-[#E5E5E0]">
                <button
                  onClick={() => onExplainMoney(selectedIssue.relatedIds.paymentId)}
                  className="px-3 py-1.5 bg-white border border-[#E5E5E0] hover:border-neutral-400 text-xs font-mono text-neutral-800 rounded-xs cursor-pointer transition-colors"
                >
                  Explain This Money
                </button>

                <button
                  onClick={() => onInvestigateRecordId(selectedIssue.recordId)}
                  className="px-4 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-mono font-bold rounded-xs cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <span>
                    {selectedIssue.status === 'RESOLVED'
                      ? 'View Audit Resolution'
                      : selectedIssue.status === 'HUMAN_REVIEW'
                      ? 'Review & Approve Action'
                      : 'Run AI Investigation'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white border border-[#E5E5E0] rounded-xs text-xs font-mono text-neutral-400">
              Select an issue from the list to inspect details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
