import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Play,
  Pause,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  X
} from 'lucide-react';

interface InteractiveDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const InteractiveDemoModal: React.FC<InteractiveDemoModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const totalSteps = 10;

  const demoSteps = [
    {
      step: 1,
      tag: 'Step 1: Event Arrival',
      title: 'Payment Event Ingested',
      desc: 'Customer completes an online checkout of ₹10,000 via UPI on Razorpay payment gateway.',
      visual: {
        paymentId: 'pay_99201',
        orderId: 'order_44102',
        amount: '₹10,000',
        method: 'UPI (hdfcbank)',
        status: 'CAPTURED',
        note: 'Gateway confirmed customer account debited'
      }
    },
    {
      step: 2,
      tag: 'Step 2: Discrepancy Detection',
      title: 'Reconciliation Identifies Discrepancy',
      desc: 'Control Tower reconciles the captured payment against nodal settlement batch and detects a ₹1,000 shortfall.',
      visual: {
        expected: '₹10,000 (Captured)',
        received: '₹9,000 (Settlement)',
        difference: '₹1,000 Variance Flagged',
        flag: 'Amount Mismatch Detected'
      }
    },
    {
      step: 3,
      tag: 'Step 3: Forensic Trace',
      title: 'Forensic Lifecycle Investigation',
      desc: 'System reconstructs the complete transaction ledger from order creation to bank nodal payout.',
      visual: {
        journey: [
          { node: 'Order Created', state: 'ok' },
          { node: 'UPI Authorized', state: 'ok' },
          { node: 'Captured ₹10,000', state: 'ok' },
          { node: 'Settlement ₹9,000', state: 'error' }
        ]
      }
    },
    {
      step: 4,
      tag: 'Step 4: Related Pattern Analysis',
      title: 'Related Pattern Clustering',
      desc: 'Engine identifies 3 additional payments from the same nodal settlement batch sharing identical discrepancy patterns.',
      visual: {
        cluster: [
          { id: 'pay_99201', amount: '₹10,000', variance: '₹1,000' },
          { id: 'pay_99208', amount: '₹10,000', variance: '₹1,000' },
          { id: 'pay_99215', amount: '₹8,500', variance: '₹850' },
          { id: 'pay_99222', amount: '₹12,000', variance: '₹1,200' }
        ],
        totalGroupImpact: '₹4,050 across 4 payments'
      }
    },
    {
      step: 5,
      tag: 'Step 5: Root Cause Explanation',
      title: 'Clear Plain-Language Root Cause',
      desc: 'Root cause summarized without technical ambiguity: an unmapped interchange fee adjustment caused the variance.',
      visual: {
        explanation: 'Customer was debited ₹10,000, but only ₹9,000 was credited in nodal settlement due to an unapplied interchange rate adjustment in batch BATCH-882.',
        confidence: '96% Verified Confidence'
      }
    },
    {
      step: 6,
      tag: 'Step 6: Safe Action Recommendation',
      title: 'Bounded Safety Guardrail Check',
      desc: 'Recommended fix evaluated against merchant automated limit policy (≤ ₹5,000 threshold).',
      visual: {
        action: 'Auto-Adjust Settlement Variance',
        impact: '₹1,000 Ledger Recovery',
        safetyRule: '✓ Variance (₹1,000) is within automated threshold limit (≤ ₹5,000)',
        approval: 'Auto-executable without manual supervisor gate'
      }
    },
    {
      step: 7,
      tag: 'Step 7: Action Authorization',
      title: 'Action Authorized & Logged',
      desc: 'Safety policy engine authorizes deterministic adjustment and signs off on the execution payload.',
      visual: {
        policy: 'STANDARD_FINANCE_GUARDRAIL_V2',
        status: 'PASSED',
        authorizedBy: 'Financial Operations Agent (Auto-Permitted)'
      }
    },
    {
      step: 8,
      tag: 'Step 8: Ledger Correction',
      title: 'Executing Compensating Entry',
      desc: 'The remediation engine posts compensatory balancing entry in the merchant ledger.',
      visual: {
        status: 'Executing Action...',
        progress: ['Adjusting settlement fee ledger...', 'Posting reconciliation credit...', 'Updating nodal ledger entry...']
      }
    },
    {
      step: 9,
      tag: 'Step 9: Post-Action Verification',
      title: 'Deterministic Invariant Verification',
      desc: 'Re-runs mathematical matching check to confirm discrepancy equals exactly ₹0.',
      visual: {
        before: '₹9,000',
        after: '₹10,000',
        difference: '₹0 (Zero Variance)'
      }
    },
    {
      step: 10,
      tag: 'Step 10: Permanent Audit Entry',
      title: 'Immutable Audit Log Recorded',
      desc: 'Timestamp, action details, policy rule, and verified ₹0 outcome committed to permanent ledger.',
      visual: {
        recovered: '+₹1,000',
        risk: '-₹1,000',
        resolved: '1 Verified Fix'
      }
    }
  ];

  // Auto-advance timer when isPlaying
  useEffect(() => {
    let interval: any;
    if (isPlaying && isOpen) {
      interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= totalSteps) {
            setIsPlaying(false);
            return totalSteps;
          }
          return prev + 1;
        });
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isOpen]);

  if (!isOpen) return null;

  const current = demoSteps[currentStep - 1];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xs max-w-2xl w-full overflow-hidden shadow-2xl border border-[#E5E5E0] animate-in fade-in zoom-in-95 duration-150">
        {/* Minimal Black Header */}
        <div className="bg-[#111111] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-white"></span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400 font-mono text-[10px] uppercase tracking-wider font-bold">
                  60-Second Walkthrough
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  ({currentStep} of {totalSteps})
                </span>
              </div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                {current.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-xs text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-white" />}
              <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1 rounded-xs transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-0.5 bg-neutral-200 w-full">
          <div
            className="h-full bg-black transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          ></div>
        </div>

        {/* Main Content Body */}
        <div className="p-6 space-y-6">
          <p className="text-sm text-[#111111] font-medium leading-relaxed">
            {current.desc}
          </p>

          {/* Dynamic Visual Stage Area */}
          <div className="bg-[#F8F8F6] border border-[#E5E5E0] rounded-xs p-5 font-mono text-xs space-y-4">
            {currentStep === 1 && (
              <div className="space-y-2">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                  Incoming Webhook Payload
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-white border border-[#E5E5E0] rounded-xs">
                    <span className="text-neutral-500 block text-[10px]">Payment ID:</span>
                    <strong className="text-[#111111]">pay_99201</strong>
                  </div>
                  <div className="p-2.5 bg-white border border-[#E5E5E0] rounded-xs">
                    <span className="text-neutral-500 block text-[10px]">Order ID:</span>
                    <strong className="text-[#111111]">order_44102</strong>
                  </div>
                  <div className="p-2.5 bg-white border border-[#E5E5E0] rounded-xs">
                    <span className="text-neutral-500 block text-[10px]">Amount Debited:</span>
                    <strong className="text-[#111111] font-bold text-sm">₹10,000</strong>
                  </div>
                  <div className="p-2.5 bg-white border border-[#E5E5E0] rounded-xs">
                    <span className="text-neutral-500 block text-[10px]">Method:</span>
                    <strong className="text-[#111111]">UPI (hdfcbank)</strong>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-3">
                <div className="text-[10px] text-neutral-700 uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-neutral-800" />
                  <span>Discrepancy Detected by Payment Matching</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 bg-white border border-[#E5E5E0] rounded-xs">
                    <div className="text-neutral-500 text-[10px]">Expected Amount</div>
                    <div className="text-sm font-bold text-[#111111] mt-1">₹10,000</div>
                  </div>
                  <div className="p-3 bg-white border border-[#E5E5E0] rounded-xs">
                    <div className="text-neutral-500 text-[10px]">Settled Amount</div>
                    <div className="text-sm font-bold text-neutral-700 mt-1">₹9,000</div>
                  </div>
                  <div className="p-3 bg-neutral-100 border border-neutral-300 rounded-xs">
                    <div className="text-neutral-700 text-[10px] font-bold">Variance</div>
                    <div className="text-sm font-bold text-[#111111] mt-1">₹1,000</div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-3">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                  Payment Lifecycle Trace
                </div>
                <div className="flex items-center justify-between gap-1 overflow-x-auto py-2">
                  {[
                    { label: 'Customer Checkout', status: '✓' },
                    { label: 'UPI Authorized', status: '✓' },
                    { label: 'Captured ₹10k', status: '✓' },
                    { label: 'Settlement ₹9k', status: '⚠️' }
                  ].map((st, i) => (
                    <div key={i} className="flex items-center gap-1 shrink-0">
                      <div className={`px-2.5 py-1.5 rounded-xs text-[11px] font-bold ${
                        st.status === '⚠️' ? 'bg-neutral-200 text-neutral-900 border border-neutral-400' : 'bg-white text-neutral-800 border border-[#E5E5E0]'
                      }`}>
                        {st.status} {st.label}
                      </div>
                      {i < 3 && <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-2">
                <div className="text-[10px] text-neutral-700 uppercase tracking-wider font-bold">
                  Cluster: 4 Related Payments Found in Same Settlement Batch
                </div>
                <div className="space-y-1 text-[11px]">
                  {['pay_99201 — ₹10,000 (₹1,000 variance)', 'pay_99208 — ₹10,000 (₹1,000 variance)', 'pay_99215 — ₹8,500 (₹850 variance)', 'pay_99222 — ₹12,000 (₹1,200 variance)'].map((row, i) => (
                    <div key={i} className="p-2 bg-white border border-[#E5E5E0] rounded-xs flex items-center justify-between">
                      <span>{row}</span>
                      <span className="text-neutral-600 font-bold text-[10px]">Same Batch</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="p-4 bg-white border border-[#E5E5E0] rounded-xs space-y-2">
                <div className="flex items-center justify-between text-neutral-600 text-[10px] font-bold uppercase">
                  <span>Plain-Language Root Cause</span>
                  <span className="text-neutral-900">96% Confidence</span>
                </div>
                <p className="text-xs text-[#111111] leading-relaxed font-sans font-medium">
                  "The customer was charged ₹10,000, but only ₹9,000 was credited in the bank settlement due to an unapplied interchange rate adjustment in batch BATCH-882."
                </p>
              </div>
            )}

            {currentStep === 6 && (
              <div className="space-y-2">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                  Safety Rules Evaluation
                </div>
                <div className="p-3 bg-white border border-[#E5E5E0] rounded-xs space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-neutral-900 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Action: Auto-Adjust Settlement Variance</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Amount (₹1,000) is within automated policy limit (≤ ₹5,000)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-500">
                    <span>✓ Autonomous safe execution permitted</span>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 7 && (
              <div className="p-4 bg-white border border-[#E5E5E0] rounded-xs text-center space-y-1">
                <ShieldCheck className="w-5 h-5 text-neutral-800 mx-auto" />
                <div className="text-xs font-bold text-[#111111] uppercase">
                  Safety Gate Approved
                </div>
                <p className="text-[11px] text-neutral-600">
                  Execution authorized under STANDARD_FINANCE_GUARDRAIL_V2
                </p>
              </div>
            )}

            {currentStep === 8 && (
              <div className="space-y-2">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                  Executing Safe Action
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-2 text-neutral-900">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Adjusted settlement fee ledger for ₹1,000</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-900">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Created reconciliation offset entry</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-900">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Updated bank payout reference</span>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 9 && (
              <div className="p-4 bg-white border border-[#E5E5E0] rounded-xs space-y-3">
                <div className="flex items-center justify-between text-[#111111] font-bold text-xs">
                  <span>Deterministic Invariant Check</span>
                  <span>Match Confirmed ✓</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-[#F8F8F6] rounded-xs">
                    <span className="text-[10px] text-neutral-500 block">Before</span>
                    <strong>₹9,000</strong>
                  </div>
                  <div className="p-2 bg-[#F8F8F6] rounded-xs">
                    <span className="text-[10px] text-neutral-500 block">After</span>
                    <strong className="text-[#111111]">₹10,000</strong>
                  </div>
                  <div className="p-2 bg-neutral-100 border border-neutral-300 rounded-xs">
                    <span className="text-[10px] text-neutral-700 block font-bold">Difference</span>
                    <strong className="text-[#111111]">₹0 Resolved</strong>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 10 && (
              <div className="space-y-3">
                <div className="text-[10px] text-neutral-700 uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Real-Time Business Outcomes</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 bg-white border border-[#E5E5E0] rounded-xs">
                    <div className="text-[10px] text-neutral-500 uppercase">Capital Resolved</div>
                    <div className="text-sm font-bold text-[#111111] mt-1">+₹1,000</div>
                  </div>
                  <div className="p-3 bg-white border border-[#E5E5E0] rounded-xs">
                    <div className="text-[10px] text-neutral-500 uppercase">Exposure Protected</div>
                    <div className="text-sm font-bold text-[#111111] mt-1">₹1,000</div>
                  </div>
                  <div className="p-3 bg-white border border-[#E5E5E0] rounded-xs">
                    <div className="text-[10px] text-neutral-500 uppercase">Audit Status</div>
                    <div className="text-sm font-bold text-[#111111] mt-1">Committed ✓</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="bg-[#F8F8F6] p-4 border-t border-[#E5E5E0] flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="px-3 py-1.5 bg-white border border-[#E5E5E0] text-xs font-mono text-neutral-600 hover:text-black disabled:opacity-30 rounded-xs cursor-pointer"
          >
            ← Previous
          </button>

          <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-400">
            {demoSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i + 1)}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  currentStep === i + 1 ? 'bg-black scale-125' : 'bg-neutral-300 hover:bg-neutral-500'
                }`}
                title={`Step ${i + 1}`}
              />
            ))}
          </div>

          {currentStep < totalSteps ? (
            <button
              onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
              className="px-4 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-medium uppercase tracking-wider rounded-xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Next Step</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => {
                onClose();
                if (onComplete) onComplete();
              }}
              className="px-4 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-medium uppercase tracking-wider rounded-xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Finish Demo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
