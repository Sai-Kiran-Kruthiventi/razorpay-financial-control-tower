# Razorpay Financial Control Tower

> **AI-powered financial control system for detecting, investigating, safely resolving, and verifying payment and reconciliation issues.**

## 🚀 Live Demo

[🚀 Open Live Demo](https://razorpay-financial-control-tower.vercel.app)

## 🏆 Razorpay AI Buildathon

**Track 4 — AI Finance Controller**

---

## 📌 Problem

Financial operations can involve many connected records such as:

- Orders
- Payments
- Refunds
- Settlements
- Webhook events
- Transactions

When these records do not match, finance teams have to manually investigate what happened.

Common problems include:

- Duplicate payments
- Missing settlements
- Refund mismatches
- Payment amount mismatches
- Delayed webhooks
- Out-of-order events
- Duplicate webhooks

Finding the mismatch is only the first step.

The bigger challenge is understanding the root cause, deciding what action is safe, executing it correctly, and verifying that the financial discrepancy is actually resolved.

---

## 💡 Our Solution

We built an **AI Financial Control Tower** that closes the complete finance-operations loop:

**DETECT → INVESTIGATE → ACT SAFELY → VERIFY**

### 1. Detect

A deterministic reconciliation engine compares related financial records and identifies mismatches.

### 2. Investigate

An AI Investigation Agent analyzes the relevant financial evidence to understand the root cause.

It can inspect information such as:

- Payment details
- Related payments
- Order information
- Refunds
- Settlements
- Event timelines
- Related transactions

### 3. Act Safely

The system applies financial safety policies before taking action.

For example:

- Actions up to ₹5,000 can be eligible for automated execution.
- Actions above ₹5,000 require human approval.

This prevents the AI from independently performing high-risk financial actions.

### 4. Verify

After an action is executed, the system runs reconciliation again.

An issue is only considered resolved when the verification confirms that the discrepancy has actually been cleared.

---

## 🔄 End-to-End Flow

```text
Financial Data
      ↓
Data Normalization
      ↓
Deterministic Reconciliation
      ↓
Issue Detection
      ↓
AI Investigation
      ↓
Evidence Collection
      ↓
Root Cause
      ↓
Recommended Action
      ↓
Safety Policy Check
      ↓
Human Approval / Automated Action
      ↓
Action Execution
      ↓
Reconciliation Again
      ↓
Verification
      ↓
Audit Trail
