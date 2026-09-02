import { ReconciliationRecord, AIInvestigation, SafetyDecision } from '../../src/types/index.js';

export interface PolicyEvaluationResult {
  allowed: boolean;
  decision: SafetyDecision;
}

export function evaluateFinancialPolicy(
  record: ReconciliationRecord,
  actionType: string,
  amount: number,
  confidence: number,
  lossExposure: number = 0
): SafetyDecision {
  const thresholdAmount = 5000;
  const isHighValue = amount > thresholdAmount || lossExposure > thresholdAmount;
  const isLowConfidence = confidence < 0.90;
  const isComplianceSensitive =
    record.exceptionType === 'AMBIGUOUS_STATE' ||
    record.exceptionType === 'REFUND_MISMATCH' ||
    record.exceptionType === 'MISSING_SETTLEMENT';

  // Determine risk level
  let riskLevel: SafetyDecision['riskLevel'] = 'LOW';
  if (amount > 15000 || record.exceptionType === 'REFUND_MISMATCH') {
    riskLevel = 'CRITICAL';
  } else if (isHighValue || isComplianceSensitive) {
    riskLevel = 'HIGH';
  } else if (isLowConfidence || record.exceptionType === 'PAYMENT_AMOUNT_MISMATCH') {
    riskLevel = 'MEDIUM';
  }

  // Safety Rule 1: High value amount check (> ₹5,000)
  if (isHighValue) {
    return {
      action: actionType,
      amount,
      riskLevel,
      safetyRuleTriggered: 'RULE_THRESHOLD_OVER_5000',
      autoExecutable: false,
      requiresHumanApproval: true,
      reason: `Amount (₹${amount.toLocaleString('en-IN')}) exceeds the ₹5,000 automated ceiling. Regulatory dual-control approval is mandated.`,
      thresholdAmount
    };
  }

  // Safety Rule 2: Regulatory / sensitive exception types
  if (isComplianceSensitive) {
    return {
      action: actionType,
      amount,
      riskLevel,
      safetyRuleTriggered: 'RULE_SENSITIVE_EXCEPTION_CATEGORY',
      autoExecutable: false,
      requiresHumanApproval: true,
      reason: `Exception category '${record.exceptionType}' involves non-standard gateway settlement or potential refund overcharge. Human sign-off required.`,
      thresholdAmount
    };
  }

  // Safety Rule 3: Low confidence threshold (< 90%)
  if (isLowConfidence) {
    return {
      action: actionType,
      amount,
      riskLevel,
      safetyRuleTriggered: 'RULE_LOW_FORENSIC_CONFIDENCE',
      autoExecutable: false,
      requiresHumanApproval: true,
      reason: `Forensic confidence (${(confidence * 100).toFixed(0)}%) is below the 90% threshold required for zero-touch execution. Human operator verification required.`,
      thresholdAmount
    };
  }

  // Safe to auto-execute (Amount ≤ ₹5,000, Confidence ≥ 90%, Standard category)
  return {
    action: actionType,
    amount,
    riskLevel: 'LOW',
    safetyRuleTriggered: 'RULE_SAFE_AUTO_EXECUTION_PERMITTED',
    autoExecutable: true,
    requiresHumanApproval: false,
    reason: `Amount is within automated threshold (₹${amount.toLocaleString('en-IN')} ≤ ₹5,000) with verified confidence (${(confidence * 100).toFixed(0)}%). Safe for automated execution.`,
    thresholdAmount
  };
}
