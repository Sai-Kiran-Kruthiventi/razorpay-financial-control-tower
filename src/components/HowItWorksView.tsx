import React, { useState } from 'react';
import {
  Search,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  ArrowRight
} from 'lucide-react';

export const HowItWorksView: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  const corePillars = [
    {
      step: '01',
      pillar: 'FIND',
      title: 'Continuous Anomaly Detection',
      summary: 'Monitors gateway captures, orders, refunds, and nodal bank settlements to identify discrepancies.',
      technicalTitle: 'Multi-Way Invariant Evaluation',
      technicalDesc: 'Streams gateway events, order records, and nodal settlement statements into a unified financial graph. Deterministically asserts invariants: Expected Amount = Actual Captured, Settlement Batch Gross = Net + Fees + Taxes, and UTR validity.',
      icon: Search
    },
    {
      step: '02',
      pillar: 'UNDERSTAND',
      title: 'Root Cause & Exposure Analysis',
      summary: 'Reconstructs the full lifecycle graph to explain why the discrepancy happened in plain English.',
      technicalTitle: 'Forensic Lifecycle Graph & Root Cause Synthesis',
      technicalDesc: 'Retrieves raw webhook signatures, bank switch responses, and gateway state transitions. Computes the exact capital at risk and provides a clear narrative without technical jargon.',
      icon: HelpCircle
    },
    {
      step: '03',
      pillar: 'ACT SAFELY',
      title: 'Policy-Bounded Remediation',
      summary: 'Determines the safest corrective action, strictly enforcing automated limit thresholds (≤ ₹5,000).',
      technicalTitle: 'Deterministic Safety Guardrails & Dual-Control Approval',
      technicalDesc: 'Evaluates proposed actions against configurable safety guardrails. Routine adjustments (≤ ₹5,000) are permitted autonomously, while high-value variances or disputed states mandate human controller sign-off.',
      icon: ShieldCheck
    },
    {
      step: '04',
      pillar: 'VERIFY',
      title: 'Mathematical Proof & Audit Trail',
      summary: 'Re-runs reconciliation after action to prove the variance equals ₹0, and commits to an immutable ledger.',
      technicalTitle: 'Post-Action Invariant Check & Permanent Log',
      technicalDesc: 'Immediately re-queries downstream accounts to verify that Expected = Actual (Difference: ₹0). Generates an immutable, timestamped audit record capturing authority, evidence, and mathematical outcome.',
      icon: CheckCircle2
    }
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 bg-black"></span>
          <h1 className="text-base font-bold text-[#111111] tracking-tight uppercase">System Architecture</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs font-bold bg-neutral-100 text-neutral-700 border border-neutral-200 uppercase">
            Operating Philosophy
          </span>
        </div>
        <p className="text-xs text-neutral-600">
          How the Financial Control Tower autonomously manages merchant payment health: FIND → UNDERSTAND → ACT SAFELY → VERIFY.
        </p>
      </div>

      {/* Operating Philosophy Banner */}
      <div className="bg-white p-5 border border-[#E5E5E0] rounded-xs space-y-4">
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
          The 4 Core Operational Stages
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {corePillars.map(p => (
            <div key={p.step} className="p-3 bg-[#F8F8F6] border border-[#E5E5E0] rounded-xs space-y-1">
              <div className="flex items-center justify-between text-neutral-400 font-mono text-[10px] font-bold">
                <span>STAGE {p.step}</span>
                <span className="text-neutral-700 font-bold uppercase">{p.pillar}</span>
              </div>
              <h4 className="text-xs font-bold text-[#111111]">{p.title}</h4>
              <p className="text-[11px] text-neutral-600 font-sans leading-snug">{p.summary}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Before vs After Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 border border-[#E5E5E0] rounded-xs space-y-2">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
            Traditional Manual Process
          </div>
          <h3 className="text-sm font-bold text-[#111111]">Fragile Spreadsheets & Delayed Detection</h3>
          <ul className="text-xs text-neutral-600 space-y-1.5 font-mono">
            <li className="flex items-center gap-1.5">
              <span className="text-neutral-400">✕</span> Discrepancies discovered days or weeks later
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-neutral-400">✕</span> Manual cross-referencing of CSV files and settlement logs
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-neutral-400">✕</span> Unclear root causes leading to recurring merchant losses
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-neutral-400">✕</span> Lack of post-fix mathematical proof of zero variance
            </li>
          </ul>
        </div>

        <div className="bg-[#111111] text-white p-5 rounded-xs space-y-2">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
            Razorpay Control Tower
          </div>
          <h3 className="text-sm font-bold text-white">Continuous, Safe Financial Operations</h3>
          <ul className="text-xs text-neutral-300 space-y-1.5 font-mono">
            <li className="flex items-center gap-1.5">
              <span className="text-white font-bold">✓</span> Real-time continuous transaction reconciliation
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-white font-bold">✓</span> Plain-language root cause explanation without technical noise
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-white font-bold">✓</span> Strictly bounded actions bounded by safety guardrails (≤ ₹5,000)
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-white font-bold">✓</span> Mathematical verification (Difference: ₹0) before closing
            </li>
          </ul>
        </div>
      </div>

      {/* Expandable Architectural Details */}
      <div className="space-y-3">
        <div className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 px-1 font-bold">
          Detailed Operational Pipeline
        </div>

        <div className="space-y-3">
          {corePillars.map((item, idx) => {
            const Icon = item.icon;
            const isExpanded = expandedSection === idx;

            return (
              <div
                key={idx}
                className="bg-white border border-[#E5E5E0] rounded-xs overflow-hidden transition-all"
              >
                <div
                  onClick={() => setExpandedSection(isExpanded ? null : idx)}
                  className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xs bg-[#F8F8F6] border border-[#E5E5E0] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-neutral-800" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-neutral-400">{item.step}</span>
                        <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wide">{item.pillar} — {item.title}</h3>
                      </div>
                      <p className="text-xs text-neutral-600 mt-0.5">{item.summary}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-neutral-400 hidden sm:inline">
                      {isExpanded ? 'Hide Architecture' : 'View Architecture'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-[#F8F8F6] text-neutral-800 p-4 border-t border-[#E5E5E0] font-mono text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-neutral-900 text-[10px] uppercase tracking-wider font-bold">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Technical Architecture: {item.technicalTitle}</span>
                    </div>
                    <p className="text-neutral-700 text-[11px] leading-relaxed font-sans">
                      {item.technicalDesc}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Safety Philosophy */}
      <div className="bg-white p-5 border border-[#E5E5E0] rounded-xs space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-neutral-900" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#111111] font-mono">
            Enterprise Safety Invariant
          </h3>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed font-sans">
          The Financial Control Tower never acts as an unconstrained autonomous agent. Actions are mathematically bounded, policy limits (≤ ₹5,000 threshold) are enforced at the API layer, dual-control sign-offs are required for human escalation, and all operations record immutable audit entries.
        </p>
      </div>
    </div>
  );
};
