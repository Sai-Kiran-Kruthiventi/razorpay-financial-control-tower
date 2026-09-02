import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ChevronRight, ArrowRight, Play, Info, X } from 'lucide-react';
import { NavView } from './Sidebar.js';

interface DemoWalkthroughProps {
  onStepAction: (view: NavView, param?: string) => void;
  onOpenInteractiveDemo?: () => void;
}

export const DemoWalkthroughBanner: React.FC<DemoWalkthroughProps> = ({
  onStepAction,
  onOpenInteractiveDemo
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  const steps = [
    {
      step: 1,
      title: '1. Overview Dashboard',
      desc: 'See Money at Risk (₹2.84L), Money Recovered (₹1.72L), Problems Found, and live AI Activity.',
      targetView: 'overview' as NavView,
      param: undefined,
      buttonLabel: 'Go to Overview'
    },
    {
      step: 2,
      title: '2. Payment Matching',
      desc: 'Browse all 500 payments watched and compared across orders, webhooks, and bank settlements.',
      targetView: 'reconciliation' as NavView,
      param: 'ALL',
      buttonLabel: 'Open Payment Matching'
    },
    {
      step: 3,
      title: '3. Problems Found',
      desc: 'Focus on detected payment issues (duplicate charges, settlement mismatches, delayed webhooks).',
      targetView: 'reconciliation' as NavView,
      param: 'EXCEPTION',
      buttonLabel: 'Filter Problems'
    },
    {
      step: 4,
      title: '4. Follow the Money (pay_80007)',
      desc: 'Trace the complete payment journey from Customer Checkout → UPI Capture → Settlement Shortfall.',
      targetView: 'explain-money' as NavView,
      param: 'pay_80007',
      buttonLabel: 'Trace Payment'
    },
    {
      step: 5,
      title: '5. Related Problems & Groups',
      desc: 'See how AI connects multiple payment issues sharing the same root cause into problem groups.',
      targetView: 'incidents' as NavView,
      param: undefined,
      buttonLabel: 'Inspect Problems'
    },
    {
      step: 6,
      title: '6. What Happened? (Audit)',
      desc: 'Review the chronological timeline proving AI decisions, safety checks, and verified fixes.',
      targetView: 'audit' as NavView,
      param: undefined,
      buttonLabel: 'View What Happened'
    },
    {
      step: 7,
      title: '7. How It Works (Architecture)',
      desc: 'Inspect the full 8-step pipeline diagram and trust philosophy crafted for hackathon judges.',
      targetView: 'how-it-works' as NavView,
      param: undefined,
      buttonLabel: 'Open Architecture'
    },
    {
      step: 8,
      title: '8. Benchmark Evaluation',
      desc: 'Inspect Precision (100%), Recall (100%), F1 Score, and high-throughput performance metrics.',
      targetView: 'evaluation' as NavView,
      param: undefined,
      buttonLabel: 'View Benchmarks'
    }
  ];

  const currentStep = steps[currentStepIndex];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-[#141414] text-white px-3.5 py-2 rounded-xs shadow-lg border border-white/20 text-xs font-semibold flex items-center gap-1.5 hover:bg-black transition-all cursor-pointer font-mono"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        <span>Open Judge Tour</span>
      </button>
    );
  }

  return (
    <div className="bg-[#141414] border-b border-white/10 text-white px-6 py-2.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-xs bg-[#800020] flex items-center justify-center font-bold text-white text-[10px] font-mono shadow-xs">
            {currentStep.step}
          </div>
          <div>
            <span className="font-bold text-amber-300 mr-2 uppercase tracking-wider text-[10px] font-mono">
              Judge Guided Tour:
            </span>
            <span className="font-semibold text-white mr-1.5">{currentStep.title} —</span>
            <span className="text-white/70">{currentStep.desc}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          {onOpenInteractiveDemo && (
            <button
              onClick={onOpenInteractiveDemo}
              className="px-2.5 py-1 bg-gradient-to-r from-[#800020] to-[#500014] text-white rounded-xs text-[11px] font-bold uppercase tracking-wider hover:opacity-90 flex items-center gap-1 cursor-pointer font-mono shadow-xs"
            >
              <Play className="w-3 h-3 text-amber-300 fill-amber-300" />
              <span>Run 60s Demo</span>
            </button>
          )}

          <button
            onClick={() => {
              onStepAction(currentStep.targetView, currentStep.param);
              if (currentStepIndex < steps.length - 1) {
                setCurrentStepIndex(prev => prev + 1);
              }
            }}
            className="px-3 py-1 bg-white text-[#141414] hover:bg-white/90 rounded-xs text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors font-mono"
          >
            <span>{currentStep.buttonLabel}</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          <button
            onClick={() => setCurrentStepIndex(prev => (prev + 1) % steps.length)}
            className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-xs text-[11px] font-mono transition-colors cursor-pointer"
            title="Next Step"
          >
            Next ({currentStepIndex + 1}/{steps.length})
          </button>

          <button
            onClick={() => setIsOpen(false)}
            className="text-white/40 hover:text-white p-1 transition-colors cursor-pointer"
            title="Close Tour Banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
