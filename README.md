# Razorpay Financial Control Tower

The **Razorpay Financial Control Tower** is an enterprise-grade financial control system designed for automated detection, multi-source investigation, safe remediation, independent verification, and cryptographic auditing of payment and reconciliation discrepancies.

---

## Problem
Modern digital payment stacks operate across complex, asynchronous multi-party ledgers (Merchant Orders, Gateway Payments, Nodal Settlements, and Webhook Events). Merchants face systemic reconciliation challenges:
- **Multi-Party Ledger Drift**: Mismatches between merchant invoices, gateway capture amounts, and bank settlement payouts.
- **Silent Nodal Settlement Discrepancies**: Interchange fee tier adjustments or bank holds applied without clear ledger attribution.
- **Asynchronous Webhook Latency**: Delayed or out-of-order event notifications creating false anomaly flags.
- **Over-Refunds & Duplicate Charges**: Network retries causing double captures or refund overages.
- **Operational Fatigue & Audit Risks**: Manual spreadsheets lack dual-control policy gates, forensic evidence trails, and post-remediation mathematical verification.

---

## Solution
The Financial Control Tower establishes an autonomous **FIND → UNDERSTAND → ACT SAFELY → VERIFY** financial control loop:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     1. FIND     │ ────> │  2. UNDERSTAND  │ ────> │  3. ACT SAFELY  │ ────> │    4. VERIFY    │
│  Deterministic  │       │  AI Forensic    │       │  Dual-Control   │       │ Independent     │
│  Reconciliation │       │  Investigation  │       │  Policy Gate    │       │ Re-Reconciliation│
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

1. **FIND**: Deterministic reconciliation continuously checks multi-party ledger invariants across payments, orders, settlements, and webhooks.
2. **UNDERSTAND**: AI Controllers execute forensic tools to pull cross-ledger timelines, correlate evidence, and isolate root causes.
3. **ACT SAFELY**: Autonomous actions are gated by strict dual-control financial policies (e.g. ₹5,000 threshold).
4. **VERIFY**: The system **NEVER** assumes resolution upon action execution. It re-runs deterministic reconciliation against updated ledger states to independently verify zero post-action variance ($\text{Variance} = \text{₹}0$).

---

## Core Capabilities
- **Deterministic Reconciliation Engine**: Zero-tolerance multi-party matching rules for payment capture, settlement UTRs, and webhook event ordering.
- **Multi-Source Financial Investigation**: Tool-assisted forensic analysis across payment, order, refund, settlement, and webhook event records.
- **AI-Assisted Root Cause Analysis**: Automated narrative generation isolating gateway timeouts, unmapped interchange tiers, or invoice voucher mismatches.
- **Structured Evidence Collection**: Reconstructs chronological audit evidence from raw API responses and database ledgers.
- **Safety & Policy Enforcement**: Enforces policy ceilings (e.g., auto-execution cap of ₹5,000) and risk scoring.
- **Human Approval Workflow**: Seamless dual-control escalation queue for high-value or high-risk financial actions.
- **Automated Safe Remediation**: Executes real ledger adjustments (issuing refunds, adjusting nodal settlement payouts, updating merchant invoice vouchers).
- **Independent Post-Action Verification**: Re-runs reconciliation post-execution to mathematically prove zero net exposure.
- **Append-Only Audit Trail**: Complete immutable event log for compliance, auditability, and forensic reviews.
- **Explain This Money**: Interactive financial search providing human-readable ledger breakdowns for any Payment, Order, or Settlement ID.
- **Synthetic Benchmark Evaluation**: Evaluates precision, recall, classification matrices (TP/FP/FN/TN), and operational metrics against Track 04 benchmarks.
- **Live Anomaly Simulator**: Injects real-time financial anomalies (duplicate payments, settlement fee mismatches, delayed events, refund overages) to test control tower resilience.

---

## Architecture

```
Data Generation (Seed 42)
  │
  ▼
Financial Store (Payments, Orders, Refunds, Settlements, Events)
  │
  ▼
Reconciliation Engine (Deterministic Multi-Party Invariant Matching)
  │
  ▼
Issue Detection & Categorization
  │
  ▼
AI Forensic Investigation (Tool Execution: getPayment, getOrder, getEventTimeline)
  │
  ▼
Evidence & Root Cause Synthesis
  │
  ▼
Safety Policy Engine (Dual-Control Gate: ≤ ₹5,000 Auto / > ₹5,000 Human Approval)
  │
  ├───────────────────────────────┐
  ▼                               ▼
Auto-Execute                Human Approval Queue
  │                               │
  └───────────────┬───────────────┘
                  │
                  ▼
Action Execution (Modifies Underlying Ledgers: Refund, Payment, Settlement, Order)
  │
  ▼
Deterministic Re-Reconciliation (Independent Post-Action Verification)
  │
  ▼
Verification Engine (Calculates Actual Post-Action Variance)
  │
  ▼
Append-Only Audit Trail
  │
  ▼
Benchmark Evaluation Metrics (Precision / Recall / Matrix)
```

---

## Supported Anomalies

- **`DUPLICATE_PAYMENT`**: Customer charged twice due to gateway timeout retry; both payment attempts captured by bank.
- **`SETTLEMENT_MISMATCH`**: Bank nodal settlement payout differs from expected merchant payout due to unmapped interchange tier fees.
- **`PAYMENT_AMOUNT_MISMATCH`**: Captured payment amount differs from merchant order invoice amount (e.g. unverified invoice voucher).
- **`DELAYED_EVENT`**: Payment captured successfully at bank, but webhook delivery delayed by network latency (timing-only anomaly, zero financial exposure).
- **`REFUND_MISMATCH`**: Cumulative refund entries exceed payment capture amount.
- **`MISSING_SETTLEMENT`**: Payment captured at gateway but missing corresponding nodal bank settlement batch.
- **`OUT_OF_ORDER_EVENT` / `DUPLICATE_WEBHOOK`**: Dropped or out-of-sequence event notifications.

---

## Safety Policy

The system implements strict financial safety rules to prevent unauthorized or high-risk ledger modifications:
- **Threshold Ceiling**: Any action involving an affected amount **$\le$ ₹5,000** can be auto-executed by the AI Controller if investigation confidence is $\ge 90\%$.
- **Human Approval Requirement**: Any action involving an affected amount **$>$ ₹5,000** or flagged as `HIGH` risk is automatically routed to the Human Finance Ops review queue.
- **Dual-Control Enforcement**: Automated execution is blocked without explicit human sign-off for high-value transactions.

---

## Benchmark & Simulation Behavior

- **Baseline Dataset**: 500 synthetic records deterministically generated with Seed 42 (447 clean matched payments + 53 ground-truth exceptions).
- **Real-Time Simulation**: Invoking the Anomaly Simulator appends real-time records ($501^{\text{st}}, 502^{\text{nd}}, \dots$), triggering live issue detection, investigation, and evaluation metric updates without corrupting baseline state.
- **Clean Reset**: Executing `Reset Dataset` restores the exact 500-record baseline snapshot and clears all simulated audit logs.

---

## Technology Stack

- **Core**: TypeScript, HTML5, Vanilla CSS
- **Frontend**: React 19, Lucide React Icons
- **Backend / Dev Server**: Node.js, Express, TSX, Esbuild
- **Bundler**: Vite 6
- **AI Integration**: `@google/genai` (Google Gemini API)

---

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start local development server (runs full backend Express API and Vite dev server):
   ```bash
   npm run dev
   ```

3. Access application in browser at: `http://localhost:3000` (or displayed local port).

---

## Production Build

1. Build production bundle (compiles Vite static assets and bundles Node server):
   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   # Or:
   node dist/server.cjs
   ```

---

## Environment Variables

Copy `.env.example` to `.env` to configure optional keys:

```ini
# Required for live Gemini AI API calls (system falls back to deterministic analysis if unprovided)
GEMINI_API_KEY="your_gemini_api_key"

# Hosting URL
APP_URL="http://localhost:3000"

# Optional: Razorpay Test Mode credentials (system uses synthetic benchmark by default)
RAZORPAY_KEY_ID="rzp_test_xxxx"
RAZORPAY_KEY_SECRET="your_test_secret"
```

---

## Testing

Run automated end-to-end verification and metric invariant tests:

```bash
npm test
# Or:
npx tsx scripts/test_e2e.ts
```

To run TypeScript typechecking:
```bash
npm run lint
# Or:
npx tsc --noEmit
```

---

## Demo Flow

For live demonstration or judging walkthrough:

1. **Reset Dataset**: Click **Reset Data** in sidebar to guarantee 500 baseline records (447 matched, 53 exceptions).
2. **Simulate Anomaly**: Click **Simulate Issue** in topbar $\rightarrow$ select **Duplicate Payment** (Amount: ₹12,000). Total records increment to 501.
3. **Investigate**: Click **Investigate** on the new incident `REC-SIM-501`.
4. **Inspect Evidence & Root Cause**: Observe tool calls (`getPayment`, `getOrder`, `getEventTimeline`) pulling multi-source evidence and isolating gateway retry timeout.
5. **Observe Safety Check**: Note that because amount = ₹12,000 ($>\text{₹}5,000$), auto-execution is blocked and requires **Human Approval**.
6. **Execute Action**: Click **Approve & Execute Action** (`INITIATE_REFUND_REVIEW`).
7. **Independent Verification**: Observe the system re-running deterministic reconciliation to verify post-action variance is **₹0**.
8. **Audit Trail**: Navigate to **Audit Trail & Verification** to view the immutable audit entry.
9. **Evaluation**: Navigate to **Benchmark Evaluation** to review updated classification metrics.

---

## Important Design Principle

> **Financial resolution is NEVER assumed merely because an action executes.**
> 
> When a remediation action is triggered, the system modifies the underlying database entities (issuing refunds, adjusting nodal settlement payouts, updating merchant order vouchers). The deterministic reconciliation engine then re-evaluates the updated state against all multi-party ledger invariants. Only when post-action variance is mathematically proven to be **₹0** is the issue marked as resolved.
