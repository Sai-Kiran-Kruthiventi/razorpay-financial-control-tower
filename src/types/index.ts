export type IssueStatus =
  | 'DETECTED'
  | 'INVESTIGATING'
  | 'ACTION_RECOMMENDED'
  | 'HUMAN_REVIEW'
  | 'ACTION_EXECUTED'
  | 'VERIFYING'
  | 'RESOLVED'
  | 'UNRESOLVED';

export type RecordStatus = 
  | 'MATCHED'
  | 'MISMATCH'
  | 'EXCEPTION'
  | 'AI_RESOLVED'
  | 'HUMAN_REVIEW'
  | 'UNRESOLVED'
  | 'DETECTED'
  | 'INVESTIGATING'
  | 'ACTION_RECOMMENDED'
  | 'ACTION_EXECUTED'
  | 'VERIFYING'
  | 'RESOLVED';

export type AnomalyType =
  | 'NONE'
  | 'DUPLICATE_PAYMENT'
  | 'DUPLICATE_WEBHOOK'
  | 'DELAYED_EVENT'
  | 'OUT_OF_ORDER_EVENT'
  | 'PAYMENT_AMOUNT_MISMATCH'
  | 'REFUND_MISMATCH'
  | 'SETTLEMENT_MISMATCH'
  | 'MISSING_EVENT'
  | 'MISSING_SETTLEMENT'
  | 'MISSING_PAYMENT'
  | 'AMBIGUOUS_STATE';

export type PaymentStatus = 'captured' | 'failed' | 'authorized' | 'refunded' | 'pending';
export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: 'Standard' | 'Premium' | 'Enterprise';
}

export interface Order {
  id: string;
  customerId: string;
  amount: number; // in INR
  currency: string;
  receipt: string;
  status: 'created' | 'attempted' | 'paid';
  createdAt: string;
  itemsSummary: string;
}

export interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  fee: number;
  tax: number;
  netAmount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  methodDetails?: string;
  createdAt: string;
  capturedAt?: string;
  bankRrn?: string;
  isDuplicate?: boolean;
  errorCode?: string;
  errorDescription?: string;
}

export interface Refund {
  id: string;
  paymentId: string;
  orderId: string;
  amount: number;
  status: 'processed' | 'pending' | 'failed';
  speed: 'normal' | 'optimum';
  reason: string;
  createdAt: string;
  processedAt?: string;
  isDuplicate?: boolean;
}

export interface Settlement {
  id: string;
  paymentIds: string[];
  grossAmount: number;
  feesDeducted: number;
  taxDeducted: number;
  netSettled: number;
  utr: string;
  status: 'settled' | 'processed' | 'reversed' | 'on_hold';
  settledAt: string;
  discrepancyNote?: string;
}

export interface WebhookEvent {
  id: string;
  event: 'payment.authorized' | 'payment.captured' | 'payment.failed' | 'refund.processed' | 'settlement.processed';
  entityId: string;
  timestamp: string;
  deliveryStatus: 'delivered' | 'delayed' | 'dropped' | 'duplicate';
  latencyMs: number;
  payloadSnippet: string;
}

export interface TimelineNode {
  id: string;
  stage: 'Customer' | 'Order' | 'Payment Attempt' | 'Payment Failed' | 'Retry Attempt' | 'Payment Captured' | 'Refund' | 'Settlement';
  timestamp: string;
  title: string;
  subtitle: string;
  amount?: number;
  status: 'success' | 'warning' | 'critical' | 'neutral';
  meta?: Record<string, string | number | boolean>;
}

export interface SafetyDecision {
  action: string;
  amount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  safetyRuleTriggered: string;
  autoExecutable: boolean;
  requiresHumanApproval: boolean;
  reason: string;
  thresholdAmount: number;
}

export interface AIInvestigation {
  id: string;
  recordId: string;
  incidentId?: string;
  whatHappened?: string;
  whyDidItHappen?: string;
  rootCause: string;
  evidence: {
    timestamp: string;
    event: string;
    detail: string;
    status: 'ok' | 'warning' | 'critical';
  }[];
  toolCalls?: {
    tool: string;
    parameters: Record<string, any>;
    outputSummary: string;
  }[];
  financialImpact: {
    affectedAmount: number;
    currency: string;
    lossExposure: number;
    explanation: string;
  };
  confidence: number; // 0 to 1
  recommendedAction: {
    id: string;
    type: 'MARK_RECONCILED' | 'INITIATE_REFUND_REVIEW' | 'ADJUST_SETTLEMENT_FEE' | 'NOTIFY_MERCHANT' | 'ESCALATE_HUMAN' | 'FLAG_TRANSACTION';
    label: string;
    description: string;
    autoExecutable: boolean;
  };
  requiresHumanApproval: boolean;
  safety?: SafetyDecision;
  policyCheck: {
    passed: boolean;
    policyName: string;
    reason: string;
    thresholdAmount: number;
  };
  verification?: {
    verified: boolean;
    difference: number;
    details: string;
  } | null;
  rawAiAnalysis?: string;
  timestamp: string;
}

export interface FinancialIssue {
  id: string;
  issueType: AnomalyType;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  affectedAmount: number;
  relatedIds: {
    orderId?: string;
    paymentId?: string;
    refundId?: string;
    settlementId?: string;
    customerId?: string;
  };
  status: IssueStatus;
  evidence: string[];
  createdTime: string;
  resolvedAt?: string;
  recordId: string;
  investigation?: AIInvestigation;
  actionTaken?: string;
  verificationResult?: string;
}

export interface ReconciliationRecord {
  id: string; // e.g. REC-001
  orderId: string;
  paymentId: string;
  refundId?: string;
  settlementId?: string;
  customerId: string;
  customerName: string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  status: RecordStatus;
  issueStatus?: IssueStatus;
  exceptionType: AnomalyType;
  exceptionDescription?: string;
  groundTruthAnomaly?: AnomalyType; // For evaluation against injected ground truth
  incidentId?: string;
  matchedRules: string[];
  reconciledAt: string;
  investigation?: AIInvestigation;
  actionTaken?: string;
  resolvedAt?: string;
}

export interface Incident {
  id: string; // INC-001
  title: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  affectedRecordIds: string[];
  totalAmountAffected: number;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'HUMAN_REVIEW_REQUIRED' | 'DISMISSED';
  rootCauseSummary: string;
  confidence: number;
  createdAt: string;
  resolvedAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  entityId: string;
  entityType: 'RECONCILIATION' | 'INCIDENT' | 'PAYMENT' | 'ACTION' | 'POLICY' | 'INVESTIGATION' | 'VERIFICATION';
  event: string;
  aiDecision?: string;
  evidence?: string[];
  policyResult?: string;
  actionTaken: string;
  verificationResult: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | 'RESOLVED';
  operator: 'AI Controller' | 'Human Finance Ops' | 'System Deterministic Engine';
  details?: string;
}

export interface DashboardMetrics {
  totalProcessed: number;
  settledAmount: number;
  amountAffected: number;
  resolvedAmount: number;
  unresolvedAmount: number;
  totalRecords: number;
  baselineRecords?: number;
  simulatedRecords?: number;
  matchedCount: number;
  exceptionCount: number;
  resolvedCount: number;
  humanReviewCount: number;
  investigatingCount: number;
  unresolvedCount: number;
  openCount: number;
  openIncidentsCount?: number;
  resolvedIncidentsCount?: number;
  totalIncidentsCount?: number;
  activeIncidents: Incident[];
  recentAuditLogs: AuditLog[];
}

export interface EvaluationMetrics {
  dataset: {
    totalRecords: number;
    baselineRecords?: number;
    simulatedRecords?: number;
    normalRecords: number;
    injectedAnomalies: number;
    anomalyRatio: number;
  };
  reconciliation: {
    matchRate: number;
    exceptionRate: number;
    precision: number;
    recall: number;
    f1Score: number;
    accuracy: number;
    falsePositiveRate?: number;
    detectionRate?: number;
  };
  operations: {
    recordsProcessed: number;
    processingTimeMs: number;
    throughputPerSec: number;
    aiResolutions: number;
    humanEscalations: number;
    unresolvedCases: number;
    meanLatencyMs: number;
  };
  financialImpact: {
    totalProcessedAmount: number;
    settledAmount: number;
    amountAffected: number;
    amountResolved: number;
    amountUnresolved: number;
  };
  confusionMatrix: {
    truePositive: number;
    falsePositive: number;
    trueNegative: number;
    falseNegative: number;
  };
  anomalyBreakdown: {
    type: AnomalyType;
    label: string;
    groundTruthCount: number;
    detectedCount: number;
    resolvedCount: number;
    unresolvedCount: number;
    precision: number;
    recall: number;
  }[];
}
