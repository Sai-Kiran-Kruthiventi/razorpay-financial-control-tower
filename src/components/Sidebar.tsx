import React, { useState } from 'react';
import {
  LayoutDashboard,
  GitCompare,
  AlertTriangle,
  SearchCheck,
  History,
  Award,
  BookOpen,
  ReceiptText,
  Play,
  Zap,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export type NavView =
  | 'overview'
  | 'reconciliation'
  | 'incidents'
  | 'transactions'
  | 'explain-money'
  | 'audit'
  | 'how-it-works'
  | 'evaluation';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  exceptionCount: number;
  openIncidentCount: number;
  onResetData: () => void;
  onOpenSimulator: () => void;
  onOpenDemo?: () => void;
  isResetting: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  exceptionCount,
  openIncidentCount,
  onResetData,
  onOpenSimulator,
  onOpenDemo,
  isResetting
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const controlRoomItems: {
    id: NavView;
    label: string;
    subLabel: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      subLabel: 'Command dashboard',
      icon: LayoutDashboard
    },
    {
      id: 'reconciliation',
      label: 'Reconciliation',
      subLabel: 'Multi-party comparison',
      icon: GitCompare,
      badge: exceptionCount,
      badgeColor: 'bg-neutral-800 text-neutral-300 border border-neutral-700'
    },
    {
      id: 'incidents',
      label: 'Issues',
      subLabel: 'Problems needing attention',
      icon: AlertTriangle,
      badge: openIncidentCount,
      badgeColor: 'bg-neutral-800 text-neutral-200 border border-neutral-700'
    },
    {
      id: 'transactions',
      label: 'Transactions',
      subLabel: 'Raw multi-table ledgers',
      icon: ReceiptText
    },
    {
      id: 'explain-money',
      label: 'Explain This Money',
      subLabel: 'End-to-end payment trace',
      icon: SearchCheck
    }
  ];

  const operationsItems: {
    id: NavView;
    label: string;
    subLabel: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }[] = [
    {
      id: 'audit',
      label: 'Audit Trail',
      subLabel: 'Verified decisions & fixes',
      icon: History
    },
    {
      id: 'evaluation',
      label: 'Evaluation',
      subLabel: 'Track 04 benchmark metrics',
      icon: Award
    }
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-60'
      } bg-[#111111] text-white flex flex-col border-r border-white/10 shrink-0 select-none transition-all duration-200 relative`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-6 h-6 bg-white text-black rounded-xs flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            ₹
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-sm uppercase text-white truncate">RAZORPAY</span>
              </div>
              <div className="text-[9px] tracking-[0.18em] text-white/40 uppercase font-mono truncate">
                Control Tower
              </div>
            </div>
          )}
        </div>

        {/* Collapse toggle button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white/40 hover:text-white p-1 rounded-xs transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Status indicator when expanded */}
      {!isCollapsed && (
        <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/10 text-xs">
          <div className="flex items-center justify-between text-[10px] font-mono text-white/50 uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-white/80 font-medium">Engine Active</span>
            </div>
            <span>500 Records</span>
          </div>
          {openIncidentCount > 0 && (
            <p className="text-white/60 text-[11px] mt-1 font-sans">
              <strong className="text-white font-medium">{openIncidentCount} issues</strong> need attention
            </p>
          )}
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 py-3 space-y-4 overflow-y-auto overflow-x-hidden">
        {/* CONTROL ROOM GROUP */}
        <div>
          {!isCollapsed && (
            <div className="px-4 mb-1.5 text-[9px] text-white/30 uppercase tracking-widest font-mono font-bold">
              Control Room
            </div>
          )}
          <ul className="space-y-0.5 px-2">
            {controlRoomItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <li key={item.id}>
                  <button
                    id={`nav-btn-${item.id}`}
                    onClick={() => onSelectView(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-2.5 py-2'
                    } text-xs transition-colors cursor-pointer rounded-xs ${
                      isActive
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-white/50'}`} />
                      {!isCollapsed && (
                        <div className="text-left truncate">
                          <span className="block truncate text-xs">{item.label}</span>
                        </div>
                      )}
                    </div>
                    {!isCollapsed && typeof item.badge === 'number' && item.badge > 0 && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ${
                          item.badgeColor || 'bg-white/10 text-white/80'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isCollapsed && typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white"></span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* OPERATIONS GROUP */}
        <div>
          {!isCollapsed && (
            <div className="px-4 mb-1.5 text-[9px] text-white/30 uppercase tracking-widest font-mono font-bold">
              Operations
            </div>
          )}
          <ul className="space-y-0.5 px-2">
            {operationsItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <li key={item.id}>
                  <button
                    id={`nav-btn-${item.id}`}
                    onClick={() => onSelectView(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-2.5 py-2'
                    } text-xs transition-colors cursor-pointer rounded-xs ${
                      isActive
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-white/50'}`} />
                      {!isCollapsed && (
                        <div className="text-left truncate">
                          <span className="block truncate text-xs">{item.label}</span>
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* BOTTOM ACTION */}
        <div className="px-2 pt-2 space-y-1.5 border-t border-white/10">
          <button
            id="btn-simulate-webhook"
            onClick={onOpenSimulator}
            title="Simulate Issue"
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'gap-2 px-3 py-2'
            } rounded-xs text-xs font-medium text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-colors cursor-pointer`}
          >
            <Zap className="w-3.5 h-3.5 text-white/80 shrink-0" />
            {!isCollapsed && <span>Simulate Issue</span>}
          </button>

          {onOpenDemo && (
            <button
              id="btn-sidebar-run-demo"
              onClick={onOpenDemo}
              title="60s Walkthrough"
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-1.5' : 'gap-2 px-3 py-1.5'
              } rounded-xs text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer font-mono`}
            >
              <Play className="w-3 h-3 text-white/50 shrink-0" />
              {!isCollapsed && <span>60s Walkthrough</span>}
            </button>
          )}

          <button
            id="btn-reset-dataset"
            onClick={onResetData}
            disabled={isResetting}
            title="Reset 500 Records"
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-1.5' : 'gap-2 px-3 py-1.5'
            } rounded-xs text-xs font-medium text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer font-mono`}
          >
            <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''} shrink-0`} />
            {!isCollapsed && <span>{isResetting ? 'Resetting...' : 'Reset Records'}</span>}
          </button>
        </div>
      </nav>

      {/* Safety Policy Rule at Footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-white/10 bg-black/40 text-[10px] font-mono text-white/50 space-y-1">
          <div className="flex items-center justify-between">
            <span>Safety Rule:</span>
            <span className="text-white/80 font-medium">≤ ₹5,000 Auto</span>
          </div>
          <div className="flex items-center justify-between text-white/40">
            <span>Seed:</span>
            <span>42 (Fixed)</span>
          </div>
        </div>
      )}
    </aside>
  );
};
