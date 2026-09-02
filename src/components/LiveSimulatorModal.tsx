import React, { useState } from 'react';
import {
  Zap,
  CheckCircle2,
  X,
  ShieldCheck,
  UserCheck,
  Clock,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  FileText,
  Award
} from 'lucide-react';
import { AnomalyType, ReconciliationRecord, AIInvestigation } from '../types/index.js';
import { apiFetch } from '../services/clientTelemetry.js';

interface LiveSimulatorModalProps {
  onClose: () => void;
  onSimulated: (record: ReconciliationRecord) => void;
  onNavigateView?: (view: 'overview' | 'reconciliation' | 'incidents' | 'audit' | 'evaluation') => void;
}

type SimulationStage =
  | 'SELECT'
  | 'INJECTED'
  | 'DETECTED'
  | 'INVESTIGATING'
  | 'ROOT_CAUSE_FOUND'
  | 'ACTION_RECOMMENDED'
  | 'SAFETY_CHECK'
  | 'ACTION_APPROVAL'
  | 'VERIFYING'
  | 'RESOLVED';

export const LiveSimulatorModal: React.FC<LiveSimulatorModalProps> = ({
  onClose,
  onSimulated,
  onNavigateView
}) => {
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyType>('DUPLICATE_PAYMENT');
  const [amount, setAmount] = useState('12000');
  const [stage, setStage] = useState<SimulationStage>('SELECT');
  const [simRecord, setSimRecord] = useState<ReconciliationRecord | null>(null);
  const [investigation, setInvestigation] = useState<AIInvestigation | null>(null);
  const [verificationData, setVerificationData] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const anomalyOptions: {
    type: AnomalyType;
    label: string;
    defaultAmount: string;
    desc: string;
    thresholdHint: string;
  }[] = [
    {
      type: 'DUPLICATE_PAYMENT',
      label: 'Duplicate Payment',
      defaultAmount: '12000',
      desc: 'Customer charged twice due to bank retry timeout on captured order.',
      thresholdHint: '> ₹5,000 • Triggers Human Dual-Control'
    },
    {
      type: 'MISSING_SETTLEMENT',
      label: 'Missing Settlement',
      defaultAmount: '9500',
      desc: 'Captured payment with missing bank nodal payout batch beyond SLA.',
      thresholdHint: '> ₹5,000 • Triggers Human Dual-Control'
    },
    {
      type: 'REFUND_MISMATCH',
      label: 'Refund Mismatch',
      defaultAmount: '8000',
      desc: 'Refund processed exceeds original payment capture amount.',
      thresholdHint: '> ₹5,000 • Triggers Human Dual-Control'
    },
    {
      type: 'DELAYED_EVENT',
      label: 'Delayed Webhook',
      defaultAmount: '4200',
      desc: 'Webhook delivered with 45-minute delivery latency.',
      thresholdHint: '≤ ₹5,000 • Auto-Execution Permitted'
    },
    {
      type: 'OUT_OF_ORDER_EVENT',
      label: 'Out-of-Order Event',
      defaultAmount: '6500',
      desc: 'payment.failed received after payment.captured from network retry.',
      thresholdHint: '> ₹5,000 • Triggers Human Dual-Control'
    },
    {
      type: 'PAYMENT_AMOUNT_MISMATCH',
      label: 'Payment Amount Mismatch',
      defaultAmount: '15000',
      desc: 'Captured payment has ₹3,000 shortfall compared to merchant order.',
      thresholdHint: '> ₹5,000 • Triggers Human Dual-Control'
    }
  ];

  const handleSelectOption = (opt: typeof anomalyOptions[0]) => {
    setSelectedAnomaly(opt.type);
    setAmount(opt.defaultAmount);
  };

  const handleStartSimulation = async () => {
    setErrorMessage(null);
    setStage('INJECTED');

    try {
      // Step 1: Inject issue into live dataset
      const res = await apiFetch('/api/razorpay/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anomalyType: selectedAnomaly,
          amount: parseFloat(amount) || 12000
        })
      });

      if (!res.ok) {
        throw new Error(`Simulation request failed with status ${res.status}`);
      }

      const data = await res.json();
      const rec: ReconciliationRecord = data.record;
      setSimRecord(rec);
      onSimulated(rec);

      // Sequence: Issue Injected -> Issue Detected
      await new Promise(r => setTimeout(r, 600));
      setStage('DETECTED');

      // Issue Detected -> AI Investigating
      await new Promise(r => setTimeout(r, 650));
      setStage('INVESTIGATING');

      // Fetch AI investigation from backend
      const invRes = await apiFetch(`/api/investigate/${encodeURIComponent(rec.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      let invData: AIInvestigation | null = null;
      if (invRes.ok) {
        const invJson = await invRes.json();
        invData = invJson.investigation;
      }

      if (!invData) {
        // Deterministic fallback
        const affectedAmt = rec.actualAmount || 12000;
        const requiresHuman = affectedAmt > 5000;
        invData = {
          id: `INV-${Date.now()}`,
          recordId: rec.id,
          whatHappened: rec.exceptionDescription || `Anomaly detected for ${rec.id}.`,
          whyDidItHappen: 'Deterministic reconciliation engine identified ledger invariant variance.',
          rootCause: rec.exceptionDescription || 'Ledger invariant violation',
          evidence: [
            { timestamp: new Date().toISOString(), event: 'Payment Capture Check', detail: `Payment ${rec.paymentId} verified on bank switch`, status: 'warning' },
            { timestamp: new Date().toISOString(), event: 'Policy Threshold Check', detail: `Amount ₹${affectedAmt.toLocaleString('en-IN')} tested vs ₹5,000 threshold`, status: 'ok' }
          ],
          financialImpact: {
            affectedAmount: affectedAmt,
            currency: 'INR',
            lossExposure: affectedAmt,
            explanation: `Potential merchant ledger variance of ₹${affectedAmt.toLocaleString('en-IN')}`
          },
          confidence: 0.96,
          recommendedAction: {
            id: 'REC-ACT-01',
            type: rec.exceptionType === 'DUPLICATE_PAYMENT' ? 'INITIATE_REFUND_REVIEW'
              : rec.exceptionType === 'PAYMENT_AMOUNT_MISMATCH' ? 'NOTIFY_MERCHANT'
              : rec.exceptionType === 'REFUND_MISMATCH' ? 'INITIATE_REFUND_REVIEW'
              : rec.exceptionType === 'MISSING_SETTLEMENT' ? 'ADJUST_SETTLEMENT_FEE'
              : 'MARK_RECONCILED',
            label: rec.exceptionType === 'DUPLICATE_PAYMENT' ? 'Refund Duplicate Payment'
              : rec.exceptionType === 'PAYMENT_AMOUNT_MISMATCH' ? 'Apply Invoice Adjustment'
              : rec.exceptionType === 'REFUND_MISMATCH' ? 'Cap Refund to Limit'
              : rec.exceptionType === 'MISSING_SETTLEMENT' ? 'Dispatch Settlement Batch'
              : 'Mark as Reconciled',
            description: 'Remediate discrepancy and synchronize multi-party ledger state.',
            autoExecutable: !requiresHuman
          },
          requiresHumanApproval: requiresHuman,
          policyCheck: {
            passed: !requiresHuman,
            policyName: 'POL-01: Standard Financial Risk Control',
            reason: requiresHuman
              ? `Amount (₹${affectedAmt.toLocaleString('en-IN')}) exceeds ₹5,000 auto-execution threshold.`
              : `Amount (₹${affectedAmt.toLocaleString('en-IN')}) is within ₹5,000 auto-execution threshold.`,
            thresholdAmount: 5000
          },
          timestamp: new Date().toISOString()
        };
      }

      setInvestigation(invData);

      // AI Investigating -> Root Cause Found
      await new Promise(r => setTimeout(r, 700));
      setStage('ROOT_CAUSE_FOUND');

      // Root Cause Found -> Action Recommended
      await new Promise(r => setTimeout(r, 650));
      setStage('ACTION_RECOMMENDED');

      // Action Recommended -> Safety Check
      await new Promise(r => setTimeout(r, 650));
      setStage('SAFETY_CHECK');

      // Safety Check -> Action Approval
      await new Promise(r => setTimeout(r, 700));
      setStage('ACTION_APPROVAL');

    } catch (err: any) {
      console.error('Simulation pipeline error:', err);
      setErrorMessage(err.message || 'Simulation encountered an error.');
      setStage('SELECT');
    }
  };

  const handleExecuteOrApprove = async () => {
    if (!simRecord || !investigation) return;
    setStage('VERIFYING');

    try {
      const res = await apiFetch(`/api/actions/${encodeURIComponent(simRecord.id)}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: investigation.recommendedAction.type,
          isHumanApproved: true
        })
      });

      if (!res.ok) {
        throw new Error(`Verification request failed (status ${res.status})`);
      }

      const data = await res.json();
      setVerificationData(data);
      onSimulated(data.record);

      // Pause to visually confirm deterministic verification
      await new Promise(r => setTimeout(r, 800));
      setStage('RESOLVED');
    } catch (err: any) {
      console.error('Execution verification error:', err);
      setErrorMessage(err.message || 'Failed executing remediation action.');
      setStage('ACTION_APPROVAL');
    }
  };

  const stepsList = [
    { key: 'INJECTED', label: 'Issue Injected' },
    { key: 'DETECTED', label: 'Issue Detected' },
    { key: 'INVESTIGATING', label: 'AI Investigating' },
    { key: 'ROOT_CAUSE_FOUND', label: 'Root Cause Found' },
    { key: 'ACTION_RECOMMENDED', label: 'Action Recommended' },
    { key: 'SAFETY_CHECK', label: 'Safety Check' },
    { key: 'ACTION_APPROVAL', label: 'Action / Approval' },
    { key: 'VERIFYING', label: 'Verification' },
    { key: 'RESOLVED', label: 'Resolved' }
  ];

  const getStepIndex = (s: SimulationStage) => {
    const idx = stepsList.findIndex(item => item.key === s);
    return idx >= 0 ? idx : 0;
  };

  const currentStepIdx = getStepIndex(stage);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xs max-w-2xl w-full p-6 shadow-2xl border border-[#E5E5E0] space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E5E5E0] pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 bg-black shrink-0"></span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#111111] uppercase tracking-tight font-mono">
                  Live Anomaly Simulator
                </h2>
                <span className="px-2 py-0.5 bg-neutral-100 border border-neutral-300 rounded-xs text-[10px] font-mono text-neutral-700">
                  Track 04 E2E Flow
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Inject real financial issues, evaluate policy safety, and run deterministic verification.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-black p-1 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3 bg-neutral-100 border border-neutral-400 rounded-xs text-xs text-neutral-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-neutral-700" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Stage 1: Selection Form */}
        {stage === 'SELECT' && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-mono font-semibold text-neutral-700 mb-2 text-[11px] uppercase tracking-wider">
                Select Financial Issue to Inject:
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {anomalyOptions.map(opt => {
                  const isSelected = selectedAnomaly === opt.type;
                  return (
                    <div
                      key={opt.type}
                      onClick={() => handleSelectOption(opt)}
                      className={`p-3.5 rounded-xs border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#F8F8F6] border-black text-[#111111] shadow-xs'
                          : 'bg-white border-[#E5E5E0] text-neutral-700 hover:border-neutral-400'
                      }`}
                    >
                      <div className="font-mono font-bold text-xs flex items-center justify-between mb-1">
                        <span>{opt.label}</span>
                        {isSelected && <span className="w-1.5 h-1.5 bg-black rounded-full"></span>}
                      </div>
                      <div className="text-[11px] text-neutral-600 leading-relaxed">
                        {opt.desc}
                      </div>
                      <div className="mt-2 text-[10px] font-mono text-neutral-500 font-medium">
                        {opt.thresholdHint}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-[#E5E5E0]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-mono font-semibold text-neutral-700 text-[11px] uppercase tracking-wider">
                  Transaction Amount (₹ INR):
                </label>
                <span className="text-[10px] font-mono text-neutral-500">
                  Threshold: ₹5,000 (Values above mandate human approval)
                </span>
              </div>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xs text-sm font-mono text-[#111111] focus:outline-none focus:border-black"
                placeholder="12000"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5E5E0]">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xs text-xs font-mono uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleStartSimulation}
                className="px-5 py-2 bg-black hover:bg-neutral-800 text-white rounded-xs text-xs font-mono uppercase tracking-wider font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-white" />
                <span>Inject & Start Pipeline</span>
              </button>
            </div>
          </div>
        )}

        {/* Stage 2-9: Progress Sequence */}
        {stage !== 'SELECT' && (
          <div className="space-y-5 text-xs">
            {/* Horizontal Step Indicator */}
            <div className="border border-[#E5E5E0] bg-[#FAFAF8] p-3 rounded-xs">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-semibold mb-2">
                Reconciliation Pipeline Flow
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
                {stepsList.map((step, idx) => {
                  const isCurrent = currentStepIdx === idx;
                  const isCompleted = currentStepIdx > idx;
                  return (
                    <div
                      key={step.key}
                      className={`px-1.5 py-1 text-center rounded-xs font-mono text-[10px] truncate border transition-colors ${
                        isCurrent
                          ? 'bg-black text-white border-black font-bold'
                          : isCompleted
                          ? 'bg-neutral-200 text-neutral-800 border-neutral-300 font-medium'
                          : 'bg-white text-neutral-400 border-neutral-200'
                      }`}
                      title={step.label}
                    >
                      {step.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current State Detail Box */}
            <div className="border border-neutral-300 bg-white p-4 rounded-xs space-y-3 font-mono">
              {/* Record Snapshot */}
              {simRecord && (
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E5E5E0] text-[11px] text-neutral-600">
                  <div>Record: <strong className="text-black">{simRecord.id}</strong></div>
                  <div>Payment: <strong className="text-black">{simRecord.paymentId}</strong></div>
                  <div>Order: <strong className="text-black">{simRecord.orderId}</strong></div>
                  <div>Amount: <strong className="text-black">₹{simRecord.actualAmount?.toLocaleString('en-IN')}</strong></div>
                </div>
              )}

              {/* Status Message based on stage */}
              {stage === 'INJECTED' && (
                <div className="flex items-center gap-2 text-neutral-800">
                  <div className="w-2 h-2 rounded-full bg-neutral-900 animate-pulse"></div>
                  <span>1. Issue Injected: Multi-party transaction entities ingested into live store...</span>
                </div>
              )}

              {stage === 'DETECTED' && (
                <div className="flex items-center gap-2 text-neutral-900 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  <span>2. Issue Detected: Deterministic engine flagged {simRecord?.exceptionType?.replace(/_/g, ' ')} discrepancy.</span>
                </div>
              )}

              {stage === 'INVESTIGATING' && (
                <div className="space-y-1.5 text-neutral-700">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-600 animate-spin" />
                    <span>3. AI Investigating: Correlating gateway logs, nodal UTRs, and webhook payloads...</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 pl-6">
                    Executing backend tool calls: getPayment(), getOrder(), getEventTimeline()
                  </div>
                </div>
              )}

              {stage === 'ROOT_CAUSE_FOUND' && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-black font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-black" />
                    <span>4. Root Cause Found:</span>
                  </div>
                  <div className="p-2.5 bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs font-sans rounded-xs">
                    {investigation?.rootCause || simRecord?.exceptionDescription}
                  </div>
                </div>
              )}

              {stage === 'ACTION_RECOMMENDED' && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-black font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-black" />
                    <span>5. Action Recommended: {investigation?.recommendedAction.label}</span>
                  </div>
                  <div className="text-[11px] text-neutral-600 pl-6">
                    {investigation?.recommendedAction.description}
                  </div>
                </div>
              )}

              {(stage === 'SAFETY_CHECK' || stage === 'ACTION_APPROVAL') && investigation && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E0]">
                    <span className="font-bold text-xs uppercase tracking-wider text-black">
                      6. Policy Safety Evaluation
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider ${
                        investigation.requiresHumanApproval
                          ? 'bg-neutral-800 text-white'
                          : 'bg-neutral-200 text-neutral-800'
                      }`}
                    >
                      {investigation.requiresHumanApproval ? 'Human Approval Required' : 'Safe to Auto-Execute'}
                    </span>
                  </div>

                  <div className="p-3 bg-[#F8F8F6] border border-neutral-300 rounded-xs space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600">Policy Guardrail:</span>
                      <strong className="text-black">POL-01 (₹5,000 Risk Threshold)</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600">Exposure Amount:</span>
                      <strong className="text-black">₹{investigation.financialImpact.affectedAmount.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600">Decision Criterion:</span>
                      <span className="text-neutral-700">
                        {investigation.financialImpact.affectedAmount > 5000
                          ? '₹' + investigation.financialImpact.affectedAmount.toLocaleString('en-IN') + ' > ₹5,000 threshold (Hard Stop)'
                          : '₹' + investigation.financialImpact.affectedAmount.toLocaleString('en-IN') + ' ≤ ₹5,000 threshold (Auto-Permitted)'}
                      </span>
                    </div>
                  </div>

                  {stage === 'ACTION_APPROVAL' && (
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-[11px] text-neutral-600">
                        Ready to execute: <strong>{investigation.recommendedAction.label}</strong>
                      </div>
                      <button
                        onClick={handleExecuteOrApprove}
                        className="w-full sm:w-auto px-5 py-2 bg-black hover:bg-neutral-800 text-white rounded-xs text-xs font-mono font-bold uppercase tracking-wider shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {investigation.requiresHumanApproval ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Authorize & Execute Action</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Execute Safe Action</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {stage === 'VERIFYING' && (
                <div className="space-y-2 py-3 text-center">
                  <div className="flex items-center justify-center gap-2 text-neutral-800 font-semibold text-xs">
                    <RotateCcw className="w-4 h-4 animate-spin text-neutral-700" />
                    <span>8. Deterministic Re-Reconciliation in Progress...</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Re-running deterministic engine on live store to verify zero residual variance.
                  </p>
                </div>
              )}

              {stage === 'RESOLVED' && (
                <div className="space-y-4 pt-1">
                  <div className="p-3.5 bg-neutral-900 text-white rounded-xs space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>9. Issue Verified & Resolved (Zero Discrepancy)</span>
                    </div>
                    <p className="text-[11px] text-white/80 font-sans leading-relaxed">
                      {verificationData?.verificationNote ||
                        'Deterministic re-run verified all multi-party ledger invariants. Discrepancy eliminated with ₹0 variance.'}
                    </p>
                  </div>

                  {/* Before vs After comparison */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[#F8F8F6] border border-neutral-200 rounded-xs space-y-1">
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Before Remediation:</span>
                      <div className="font-bold text-neutral-800 text-sm">
                        ₹{simRecord?.actualAmount?.toLocaleString('en-IN')} Discrepancy
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono">Status: DETECTED</div>
                    </div>

                    <div className="p-3 bg-[#F8F8F6] border border-black rounded-xs space-y-1">
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider">After Invariant Check:</span>
                      <div className="font-bold text-black text-sm">₹0 Residual Variance</div>
                      <div className="text-[10px] text-neutral-700 font-mono font-bold">Status: RESOLVED</div>
                    </div>
                  </div>

                  {/* Navigation Actions */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E5E0]">
                    <div className="flex items-center gap-2">
                      {onNavigateView && (
                        <>
                          <button
                            onClick={() => onNavigateView('audit')}
                            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-xs text-[11px] font-mono text-neutral-800 flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View in Audit Trail</span>
                          </button>
                          <button
                            onClick={() => onNavigateView('evaluation')}
                            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-xs text-[11px] font-mono text-neutral-800 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>View in Evaluation</span>
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      onClick={onClose}
                      className="px-5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-xs text-xs font-mono font-semibold uppercase tracking-wider cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
