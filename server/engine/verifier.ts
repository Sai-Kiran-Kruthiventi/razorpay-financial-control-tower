import {
  ReconciliationRecord,
  RecordStatus,
  AuditLog,
  AIInvestigation,
  IssueStatus
} from '../../src/types/index.js';
import { FinancialStore } from '../store.js';
import { executeSafeAction } from './actions.js';
import { reReconcilePayment } from './reconciler.js';

export interface VerificationResult {
  isVerified: boolean;
  newStatus: RecordStatus;
  newIssueStatus: IssueStatus;
  differenceAfter: number;
  verificationNote: string;
  auditLogs: AuditLog[];
}

export function verifyAndCommitAction(
  store: FinancialStore,
  record: ReconciliationRecord,
  investigation: AIInvestigation,
  actionType: string,
  operator: 'AI Controller' | 'Human Finance Ops'
): VerificationResult {
  const timestamp = new Date().toISOString();
  const auditLogs: AuditLog[] = [];

  // Step 1: Execute the safe action on the store
  const actionResult = executeSafeAction(store, record, actionType, operator);

  // Step 2: Audit log for Action Execution
  const actionAudit: AuditLog = {
    id: `AUD-${Date.now().toString().slice(-6)}`,
    timestamp,
    entityId: record.id,
    entityType: 'ACTION',
    event: `Action Executed: ${investigation.recommendedAction.label}`,
    aiDecision: investigation.rootCause,
    evidence: investigation.evidence.map(e => `[${e.status.toUpperCase()}] ${e.event}: ${e.detail}`),
    policyResult: investigation.policyCheck.passed ? 'Safe to Execute' : 'Human Authorization Sign-Off',
    actionTaken: `${actionType} (${investigation.recommendedAction.label})`,
    verificationResult: actionResult.executionSummary,
    status: 'SUCCESS',
    operator,
    details: actionResult.executionSummary
  };
  auditLogs.push(actionAudit);
  store.auditLogs.push(actionAudit);

  // Step 3: CRITICAL VERIFICATION - Run deterministic reconciliation again!
  const reCheck = reReconcilePayment(record.paymentId, store);

  const isVerified = reCheck.isResolved && reCheck.difference === 0;
  const newStatus: RecordStatus = isVerified ? 'AI_RESOLVED' : 'UNRESOLVED';
  const newIssueStatus: IssueStatus = isVerified ? 'RESOLVED' : 'UNRESOLVED';
  const verificationNote = reCheck.verificationNote;

  // Step 4: Update the record based on actual verified state
  if (isVerified) {
    record.status = 'AI_RESOLVED';
    record.issueStatus = 'RESOLVED';
    record.difference = 0;
    record.exceptionType = 'NONE';
    record.actionTaken = investigation.recommendedAction.label;
    record.resolvedAt = timestamp;
  } else {
    record.status = 'UNRESOLVED';
    record.issueStatus = 'UNRESOLVED';
    record.actionTaken = `Failed: ${actionType}`;
  }

  // Step 5: Audit log for Verification
  const verificationAudit: AuditLog = {
    id: `AUD-${(Date.now() + 1).toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    entityId: record.id,
    entityType: 'VERIFICATION',
    event: isVerified ? 'Verification Succeeded: Discrepancy = ₹0' : 'Verification Failed: Variance Persists',
    aiDecision: `Post-action deterministic invariant verification against payment ${record.paymentId}.`,
    evidence: reCheck.matchedRules.map(r => `Rule: ${r}`),
    policyResult: isVerified ? 'All Invariants Satisfied (Difference = ₹0)' : 'Invariant Violation Remaining',
    actionTaken: `Re-ran reconciliation engine on ${record.paymentId}`,
    verificationResult: verificationNote,
    status: isVerified ? 'RESOLVED' : 'FAILED',
    operator: 'System Deterministic Engine',
    details: verificationNote
  };
  auditLogs.push(verificationAudit);
  store.auditLogs.push(verificationAudit);

  // Step 6: Update parent incident if all affected records are now resolved
  if (record.incidentId) {
    const inc = store.incidents.find(i => i.id === record.incidentId);
    if (inc) {
      const children = store.records.filter(r => inc.affectedRecordIds.includes(r.id));
      const allChildrenResolved = children.every(c => c.status === 'AI_RESOLVED' || c.status === 'MATCHED' || c.issueStatus === 'RESOLVED');
      if (allChildrenResolved) {
        inc.status = 'RESOLVED';
        inc.resolvedAt = timestamp;
      }
    }
  }

  return {
    isVerified,
    newStatus,
    newIssueStatus,
    differenceAfter: reCheck.difference,
    verificationNote,
    auditLogs
  };
}
