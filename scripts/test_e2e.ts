import { FinancialStore } from '../server/store.js';
import { verifyAndCommitAction } from '../server/engine/verifier.js';
import { evaluateFinancialPolicy } from '../server/engine/policyEngine.js';

console.log('=== STARTING FINAL VALIDATION & METRIC INVARIANT SUITE ===\n');

const store = new FinancialStore();

function checkInvariants(m: ReturnType<FinancialStore['getDashboardMetrics']>, label: string) {
  console.log(`[INVARIANTS - ${label}]`);
  console.log(`  Total: ${m.totalRecords}, Matched: ${m.matchedCount}, Exceptions: ${m.exceptionCount}`);
  console.log(`  Resolved: ${m.resolvedCount}, HumanReview: ${m.humanReviewCount}, Investigating: ${m.investigatingCount}, Unresolved: ${m.unresolvedCount}`);
  console.log(`  Open: ${m.openCount}`);

  // Matched + Exceptions = Total
  if (m.matchedCount + m.exceptionCount !== m.totalRecords) {
    throw new Error(`INVARIANT FAILED (${label}): Matched (${m.matchedCount}) + Exceptions (${m.exceptionCount}) != Total (${m.totalRecords})`);
  }

  // Resolved + Human Review + Investigating + Unresolved = Exceptions
  const sumExceptions = m.resolvedCount + m.humanReviewCount + m.investigatingCount + m.unresolvedCount;
  if (sumExceptions !== m.exceptionCount) {
    throw new Error(`INVARIANT FAILED (${label}): Resolved (${m.resolvedCount}) + Human (${m.humanReviewCount}) + Inv (${m.investigatingCount}) + Unres (${m.unresolvedCount}) = ${sumExceptions} != Exceptions (${m.exceptionCount})`);
  }

  // Open = Human Review + Investigating + Unresolved
  const expectedOpen = m.humanReviewCount + m.investigatingCount + m.unresolvedCount;
  if (m.openCount !== expectedOpen) {
    throw new Error(`INVARIANT FAILED (${label}): Open (${m.openCount}) != Human + Inv + Unres (${expectedOpen})`);
  }

  console.log(`✓ Invariants Validated (${label})\n`);
}

// 1. Reset Baseline Check -> 500 Records (447 Matched + 53 Exceptions)
console.log('--- STEP 1: Baseline Dataset Reset (500 Records) ---');
store.reset();
const initialMetrics = store.getDashboardMetrics();

if (initialMetrics.totalRecords !== 500) {
  throw new Error(`Expected 500 total records on reset, got ${initialMetrics.totalRecords}`);
}
if (initialMetrics.matchedCount !== 447) {
  throw new Error(`Expected 447 matched records on reset, got ${initialMetrics.matchedCount}`);
}
if (initialMetrics.exceptionCount !== 53) {
  throw new Error(`Expected 53 exception records on reset, got ${initialMetrics.exceptionCount}`);
}
checkInvariants(initialMetrics, 'Baseline Reset (500 Records)');
console.log('✓ Baseline 500 Records (447 Matched + 53 Exceptions) Verified\n');

// 2. Anomaly Simulation Check -> 501 Records
console.log('--- STEP 2: Duplicate Payment Simulation (501 Records) ---');
const simResult = store.simulateAnomaly('DUPLICATE_PAYMENT', 12000);
const simMetrics = store.getDashboardMetrics();

if (simMetrics.totalRecords !== 501) {
  throw new Error(`Expected 501 total records after simulation, got ${simMetrics.totalRecords}`);
}
if (simMetrics.exceptionCount !== 54) {
  throw new Error(`Expected 54 exception records after simulation, got ${simMetrics.exceptionCount}`);
}
checkInvariants(simMetrics, 'Duplicate Payment Simulation (501 Records)');
console.log('✓ Anomaly Simulation (501 Records) Verified\n');

// 3. Safety Check & Action Remediation Verification
console.log('--- STEP 3: Safety Policy & Independent Post-Action Verification ---');
const rec = simResult.record;
const policy = evaluateFinancialPolicy(rec, 'INITIATE_REFUND_REVIEW', rec.actualAmount, 0.95, rec.actualAmount);
console.log(`Safety Policy Evaluation: PolicyRule=${policy.safetyRuleTriggered}, AutoExecutable=${policy.autoExecutable}, RequiresHuman=${policy.requiresHumanApproval}`);

if (rec.actualAmount > 5000 && policy.autoExecutable) {
  throw new Error('Safety Policy Failure: Transaction > ₹5,000 was auto-approved!');
}

const mockInvestigation = {
  id: `INV-${Date.now()}`,
  recordId: rec.id,
  whatHappened: 'Duplicate payment captured',
  whyDidItHappen: 'Gateway timeout retry',
  rootCause: 'Duplicate payment reversal',
  evidence: [],
  financialImpact: { affectedAmount: rec.actualAmount, currency: 'INR', lossExposure: rec.actualAmount, explanation: '' },
  confidence: 0.95,
  recommendedAction: { id: 'ACT-1', type: 'INITIATE_REFUND_REVIEW' as const, label: 'Refund Duplicate', description: '', autoExecutable: false },
  requiresHumanApproval: true,
  policyCheck: { passed: true, policyName: 'POL-01', reason: 'Human signed off', thresholdAmount: 5000 },
  timestamp: new Date().toISOString()
};

const verification = verifyAndCommitAction(store, rec, mockInvestigation as any, 'INITIATE_REFUND_REVIEW', 'Human Finance Ops');

if (!verification.isVerified || verification.differenceAfter !== 0) {
  throw new Error(`Verification Failed: isVerified=${verification.isVerified}, differenceAfter=₹${verification.differenceAfter}`);
}
console.log(`Verification Succeeded: Difference After = ₹${verification.differenceAfter} (${verification.verificationNote})`);

const postActionMetrics = store.getDashboardMetrics();
checkInvariants(postActionMetrics, 'Post-Action Remediation');
console.log('✓ Independent Verification Producing ₹0 Variance Confirmed\n');

// 4. Reset Clean Return Verification -> 500 Records
console.log('--- STEP 4: Reset Clean Return (500 Records) ---');
store.reset();
const finalMetrics = store.getDashboardMetrics();

if (finalMetrics.totalRecords !== 500) {
  throw new Error(`Final reset failed to return to 500 records! Got ${finalMetrics.totalRecords}`);
}
checkInvariants(finalMetrics, 'Final Reset Return (500 Records)');
console.log('✓ Clean Dataset Reset Verified\n');

console.log('=== ALL FINAL VALIDATION & METRIC INVARIANT TESTS PASSED SUCCESSFULLY! ===');
