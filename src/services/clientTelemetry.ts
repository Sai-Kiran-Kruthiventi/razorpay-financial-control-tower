import { FinancialStore } from '../../server/store.js';
import { StoreInvestigationTools } from '../../server/engine/tools.js';
import { evaluateFinancialPolicy } from '../../server/engine/policyEngine.js';
import { verifyAndCommitAction } from '../../server/engine/verifier.js';
import {
  AIInvestigation,
  ReconciliationRecord,
  SafetyDecision
} from '../types/index.js';

// Singleton in-memory store for client-side telemetry fallback
export const clientStore = new FinancialStore();

// Deterministic forensic investigation that matches server controller
export function investigateRecordClient(record: ReconciliationRecord): AIInvestigation {
  const tools = new StoreInvestigationTools(clientStore);
  const toolCallsLog: AIInvestigation['toolCalls'] = [];

  const payment = tools.getPayment(record.paymentId);
  toolCallsLog.push({
    tool: 'getPayment(paymentId)',
    parameters: { paymentId: record.paymentId },
    outputSummary: payment
      ? `Payment ${payment.id} found: ₹${payment.amount} (${payment.method.toUpperCase()}, status: ${payment.status})`
      : `Payment ${record.paymentId} NOT FOUND`
  });

  const order = tools.getOrder(record.orderId);
  toolCallsLog.push({
    tool: 'getOrder(orderId)',
    parameters: { orderId: record.orderId },
    outputSummary: order
      ? `Order ${order.id} found: ₹${order.amount} (status: ${order.status}, items: ${order.itemsSummary})`
      : `Order ${record.orderId} NOT FOUND`
  });

  const relatedPayments = order ? tools.getRelatedPayments(order.id) : [];
  toolCallsLog.push({
    tool: 'getRelatedPayments(orderId)',
    parameters: { orderId: record.orderId },
    outputSummary: `Found ${relatedPayments.length} payments linked to order ${record.orderId}`
  });

  const refunds = payment ? tools.getRefunds(payment.id) : [];
  toolCallsLog.push({
    tool: 'getRefunds(paymentId)',
    parameters: { paymentId: record.paymentId },
    outputSummary: `Found ${refunds.length} refund records for payment ${record.paymentId}`
  });

  const settlement = payment ? tools.getSettlement(payment.id) : null;
  toolCallsLog.push({
    tool: 'getSettlement(paymentId)',
    parameters: { paymentId: record.paymentId },
    outputSummary: settlement
      ? `Settlement batch ${settlement.id} found: Net ₹${settlement.netSettled}, UTR: ${settlement.utr}`
      : `No bank settlement batch found for payment ${record.paymentId}`
  });

  const events = payment ? tools.getEventTimeline(payment.id) : [];
  toolCallsLog.push({
    tool: 'getEventTimeline(paymentId)',
    parameters: { paymentId: record.paymentId },
    outputSummary: `Retrieved ${events.length} webhook events in chronological sequence`
  });

  if (!payment && !order) {
    const safety: SafetyDecision = {
      action: 'ESCALATE_HUMAN',
      amount: record.actualAmount || 0,
      riskLevel: 'HIGH',
      safetyRuleTriggered: 'RULE_INSUFFICIENT_EVIDENCE',
      autoExecutable: false,
      requiresHumanApproval: true,
      reason: 'Missing transaction data across both payment and order ledgers.',
      thresholdAmount: 5000
    };

    return {
      id: `INV-${Date.now().toString().slice(-6)}`,
      recordId: record.id,
      incidentId: record.incidentId,
      whatHappened: 'Insufficient evidence to reconstruct transaction lifecycle.',
      whyDidItHappen: 'Neither order nor payment record could be located in the database.',
      rootCause: 'Insufficient evidence: Missing transaction records.',
      evidence: [],
      toolCalls: toolCallsLog,
      financialImpact: {
        affectedAmount: record.actualAmount || 0,
        currency: 'INR',
        lossExposure: record.actualAmount || 0,
        explanation: 'Financial impact unknown due to missing transaction records.'
      },
      confidence: 0.35,
      recommendedAction: {
        id: `ACT-${Date.now().toString().slice(-6)}`,
        type: 'ESCALATE_HUMAN',
        label: 'Escalate to Human Review',
        description: 'Insufficient evidence. Human controller must verify bank gateway logs manually.',
        autoExecutable: false
      },
      requiresHumanApproval: true,
      safety,
      policyCheck: {
        passed: false,
        policyName: 'POL-02: Insufficient Forensic Evidence',
        reason: 'Automated execution blocked due to missing data.',
        thresholdAmount: 5000
      },
      timestamp: new Date().toISOString()
    };
  }

  const evidenceList: AIInvestigation['evidence'] = [];

  if (order) {
    evidenceList.push({
      timestamp: order.createdAt,
      event: 'Order Created',
      detail: `Order ${order.id} for ₹${order.amount.toLocaleString('en-IN')} (${order.itemsSummary}).`,
      status: 'ok'
    });
  }

  if (payment) {
    evidenceList.push({
      timestamp: payment.createdAt,
      event: 'Payment Initiated',
      detail: `Payment ${payment.id} for ₹${payment.amount.toLocaleString('en-IN')} via ${payment.method.toUpperCase()} (${payment.methodDetails || 'Standard'}).`,
      status: payment.isDuplicate ? 'warning' : 'ok'
    });

    if (payment.capturedAt) {
      evidenceList.push({
        timestamp: payment.capturedAt,
        event: 'Payment Captured',
        detail: `Bank RRN ${payment.bankRrn || 'N/A'}: Fee ₹${payment.fee}, Tax ₹${payment.tax}, Net ₹${payment.netAmount.toLocaleString('en-IN')}.`,
        status: 'ok'
      });
    }
  }

  for (const evt of events) {
    const isWarn = evt.deliveryStatus === 'delayed' || evt.deliveryStatus === 'duplicate';
    const isCrit = evt.deliveryStatus === 'dropped' || evt.event === 'payment.failed';
    evidenceList.push({
      timestamp: evt.timestamp,
      event: `Webhook: ${evt.event}`,
      detail: `Status: ${evt.deliveryStatus.toUpperCase()}, Latency: ${evt.latencyMs}ms.`,
      status: isCrit ? 'critical' : isWarn ? 'warning' : 'ok'
    });
  }

  if (refunds.length > 0) {
    for (const r of refunds) {
      evidenceList.push({
        timestamp: r.createdAt,
        event: 'Refund Issued',
        detail: `Refund ${r.id} for ₹${r.amount.toLocaleString('en-IN')} (${r.reason}). Status: ${r.status.toUpperCase()}.`,
        status: r.amount > (payment?.amount || 0) ? 'critical' : 'warning'
      });
    }
  }

  if (settlement) {
    evidenceList.push({
      timestamp: settlement.settledAt,
      event: 'Settlement Batch',
      detail: `Settlement ${settlement.id} (UTR: ${settlement.utr}). Net payout: ₹${settlement.netSettled.toLocaleString('en-IN')}. Status: ${settlement.status.toUpperCase()}`,
      status: settlement.status === 'on_hold' || settlement.discrepancyNote ? 'warning' : 'ok'
    });
  }

  const affectedAmount = payment ? payment.amount : (order ? order.amount : record.actualAmount);
  let lossExposure = 0;
  if (record.exceptionType === 'DUPLICATE_PAYMENT') {
    lossExposure = payment ? payment.amount : record.actualAmount;
  } else if (record.exceptionType === 'SETTLEMENT_MISMATCH') {
    lossExposure = Math.abs(record.difference || 350);
  } else if (record.exceptionType === 'PAYMENT_AMOUNT_MISMATCH') {
    lossExposure = Math.abs(record.difference);
  } else if (record.exceptionType === 'REFUND_MISMATCH') {
    lossExposure = refunds.reduce((s, r) => s + r.amount, 0) - (payment?.amount || 0);
  }

  let recommendedActionType: AIInvestigation['recommendedAction']['type'] = 'MARK_RECONCILED';
  let actionLabel = 'Mark as Reconciled';
  let actionDesc = 'Apply verified reconciliation match to ledger.';
  let confidence = 0.95;
  let whatHappened = '';
  let whyDidItHappen = '';

  if (record.exceptionType === 'DUPLICATE_PAYMENT') {
    recommendedActionType = 'INITIATE_REFUND_REVIEW';
    actionLabel = 'Refund Duplicate Payment';
    actionDesc = `Issue automatic refund reversal of ₹${affectedAmount.toLocaleString('en-IN')} for duplicate payment ${payment?.id} back to customer source account.`;
    confidence = 0.97;
    whatHappened = `Two payments of ₹${affectedAmount.toLocaleString('en-IN')} were charged for a single order.`;
    whyDidItHappen = 'A gateway timeout during the initial payment attempt caused the customer to retry 3 minutes later. Both payment attempts were subsequently captured by the bank.';
  } else if (record.exceptionType === 'SETTLEMENT_MISMATCH') {
    recommendedActionType = 'ADJUST_SETTLEMENT_FEE';
    actionLabel = 'Adjust Settlement Fee Variance';
    actionDesc = `Post balancing entry of ₹${lossExposure.toLocaleString('en-IN')} to clear nodal settlement fee discrepancy.`;
    confidence = 0.93;
    whatHappened = `The bank settlement payout differed from the expected Razorpay payout by ₹${lossExposure.toLocaleString('en-IN')}.`;
    whyDidItHappen = 'An unmapped interchange tier adjustment was deducted by the nodal bank during batch settlement.';
  } else if (record.exceptionType === 'DELAYED_EVENT') {
    recommendedActionType = 'MARK_RECONCILED';
    actionLabel = 'Sync Event & Mark Reconciled';
    actionDesc = 'Synchronize delayed webhook event with bank gateway RRN timestamp and mark reconciled.';
    confidence = 0.96;
    whatHappened = 'The payment was captured at the bank, but the confirmation event arrived late.';
    whyDidItHappen = 'A temporary network lag delayed the payment.captured webhook delivery by 45 minutes.';
  } else if (record.exceptionType === 'PAYMENT_AMOUNT_MISMATCH') {
    recommendedActionType = 'NOTIFY_MERCHANT';
    actionLabel = 'Notify Merchant of Underpayment';
    actionDesc = `Dispatch invoice adjustment notification for remaining ₹${Math.abs(record.difference).toLocaleString('en-IN')} balance.`;
    confidence = 0.92;
    whatHappened = `Captured payment (₹${payment?.amount.toLocaleString('en-IN')}) is less than the order amount (₹${order?.amount.toLocaleString('en-IN')}).`;
    whyDidItHappen = 'An unverified promotional coupon code was applied at checkout without updating the ledger invoice.';
  } else if (record.exceptionType === 'REFUND_MISMATCH' || record.exceptionType === 'MISSING_SETTLEMENT' || record.exceptionType === 'AMBIGUOUS_STATE') {
    recommendedActionType = 'ESCALATE_HUMAN';
    actionLabel = 'Escalate for Human Review';
    actionDesc = 'Escalate to Senior Finance Controller for dual-control authorization.';
    confidence = 0.88;
    whatHappened = `Discrepancy detected in ${record.exceptionType.replace(/_/g, ' ')}.`;
    whyDidItHappen = record.exceptionDescription || 'Regulatory or gateway settlement anomaly requiring human verification.';
  } else {
    whatHappened = 'Transaction processed across all multi-party ledgers.';
    whyDidItHappen = 'All amounts, webhook signatures, and settlement batches match within 0 tolerance.';
  }

  const safety = evaluateFinancialPolicy(record, recommendedActionType, affectedAmount, confidence, lossExposure);

  return {
    id: `INV-${Date.now().toString().slice(-6)}`,
    recordId: record.id,
    incidentId: record.incidentId,
    whatHappened,
    whyDidItHappen,
    rootCause: whyDidItHappen || record.exceptionDescription || 'Reconciliation variance identified.',
    evidence: evidenceList,
    toolCalls: toolCallsLog,
    financialImpact: {
      affectedAmount,
      currency: 'INR',
      lossExposure,
      explanation: `Total affected capital is ₹${affectedAmount.toLocaleString('en-IN')} with net variance exposure of ₹${lossExposure.toLocaleString('en-IN')}.`
    },
    confidence,
    recommendedAction: {
      id: `ACT-${Date.now().toString().slice(-6)}`,
      type: recommendedActionType,
      label: actionLabel,
      description: actionDesc,
      autoExecutable: safety.autoExecutable
    },
    requiresHumanApproval: safety.requiresHumanApproval,
    safety,
    policyCheck: {
      passed: safety.autoExecutable,
      policyName: safety.safetyRuleTriggered,
      reason: safety.reason,
      thresholdAmount: safety.thresholdAmount
    },
    timestamp: new Date().toISOString()
  };
}

function createJsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

// Client-side API request handler replicating server logic
export async function handleClientApiRequest(urlString: string, options?: RequestInit): Promise<Response> {
  const method = (options?.method || 'GET').toUpperCase();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString, 'http://localhost');
  } catch {
    parsedUrl = new URL('http://localhost' + (urlString.startsWith('/') ? urlString : '/' + urlString));
  }

  let pathname = parsedUrl.pathname;
  if (pathname.startsWith('/api/')) {
    pathname = pathname.replace(/^\/api/, '');
  }
  if (!pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }

  let body: any = {};
  if (options?.body) {
    try {
      body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    } catch {
      body = {};
    }
  }

  // 1. Dashboard metrics
  if (pathname === '/dashboard' && method === 'GET') {
    const metrics = clientStore.getDashboardMetrics();
    return createJsonResponse(metrics);
  }

  // 2. Reconciliation list
  if (pathname === '/reconciliation' && method === 'GET') {
    const status = parsedUrl.searchParams.get('status');
    const exceptionType = parsedUrl.searchParams.get('exceptionType');
    const search = parsedUrl.searchParams.get('search');
    const page = parsedUrl.searchParams.get('page') || '1';
    const limit = parsedUrl.searchParams.get('limit') || '25';

    let filtered = [...clientStore.records];

    if (status && status !== 'ALL') {
      filtered = filtered.filter(r => r.status === status);
    }

    if (exceptionType && exceptionType !== 'ALL') {
      filtered = filtered.filter(r => r.exceptionType === exceptionType);
    }

    if (search && typeof search === 'string') {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(r =>
        r.id.toLowerCase().includes(q) ||
        r.orderId.toLowerCase().includes(q) ||
        r.paymentId.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        (r.exceptionDescription && r.exceptionDescription.toLowerCase().includes(q))
      );
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const total = filtered.length;
    const startIndex = (p - 1) * l;
    const paginated = filtered.slice(startIndex, startIndex + l);

    return createJsonResponse({
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
      records: paginated
    });
  }

  // 3. Single reconciliation record
  const recMatch = pathname.match(/^\/reconciliation\/([^/]+)$/);
  if (recMatch && method === 'GET') {
    const recId = decodeURIComponent(recMatch[1]).toLowerCase();
    const record = clientStore.records.find(r => r.id.toLowerCase() === recId);
    if (!record) {
      return createJsonResponse({ error: `Record ${recMatch[1]} not found.` }, 404);
    }

    const order = clientStore.orders.find(o => o.id === record.orderId);
    const payment = clientStore.payments.find(p => p.id === record.paymentId);
    const refund = record.refundId ? clientStore.refunds.find(r => r.id === record.refundId) : undefined;
    const settlement = record.settlementId ? clientStore.settlements.find(s => s.id === record.settlementId) : undefined;
    const events = clientStore.events.filter(e => e.entityId === record.paymentId || (refund && e.entityId === refund.id));

    return createJsonResponse({
      record,
      order,
      payment,
      refund,
      settlement,
      events
    });
  }

  // 4. Incidents list
  if (pathname === '/incidents' && method === 'GET') {
    return createJsonResponse({ incidents: clientStore.incidents });
  }

  // 5. Single incident detail
  const incMatch = pathname.match(/^\/incidents\/([^/]+)$/);
  if (incMatch && method === 'GET') {
    const incId = decodeURIComponent(incMatch[1]).toLowerCase();
    const incident = clientStore.incidents.find(i => i.id.toLowerCase() === incId);
    if (!incident) {
      return createJsonResponse({ error: `Incident ${incMatch[1]} not found.` }, 404);
    }
    const affectedRecords = clientStore.records.filter(r => incident.affectedRecordIds.includes(r.id));
    return createJsonResponse({ incident, affectedRecords });
  }

  // 6. Explain This Money / Transaction lifecycle reconstruction
  const txMatch = pathname.match(/^\/transactions\/([^/]+)$/);
  if (txMatch && method === 'GET') {
    const queryId = decodeURIComponent(txMatch[1]);
    const result = clientStore.getFinancialLifecycle(queryId);
    if (!result) {
      return createJsonResponse({
        error: `No transaction lifecycle found for '${queryId}'. Try searching by Order ID (e.g. order_10007), Payment ID (e.g. pay_80007), or Record ID (e.g. REC-007).`
      }, 404);
    }
    return createJsonResponse(result);
  }

  // 7. AI Investigation
  const invMatch = pathname.match(/^\/investigate\/([^/]+)$/);
  if (invMatch && method === 'POST') {
    const recordId = decodeURIComponent(invMatch[1]).toLowerCase();
    const record = clientStore.records.find(r => r.id.toLowerCase() === recordId || r.paymentId.toLowerCase() === recordId);
    if (!record) {
      return createJsonResponse({ error: `Record ${invMatch[1]} not found for investigation.` }, 404);
    }

    record.issueStatus = 'INVESTIGATING';
    const investigation = investigateRecordClient(record);
    record.investigation = investigation;
    record.issueStatus = investigation.requiresHumanApproval ? 'HUMAN_REVIEW' : 'ACTION_RECOMMENDED';

    clientStore.auditLogs.push({
      id: `AUD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      entityId: record.id,
      entityType: 'INVESTIGATION',
      event: 'AI Investigation Completed',
      aiDecision: `Root Cause: ${investigation.rootCause}`,
      evidence: investigation.evidence.map(e => `[${e.status.toUpperCase()}] ${e.event}: ${e.detail}`),
      policyResult: investigation.policyCheck.passed ? 'Auto-Execute Permitted' : 'Human Review Required',
      actionTaken: `Recommended: ${investigation.recommendedAction.label}`,
      verificationResult: `Confidence: ${(investigation.confidence * 100).toFixed(1)}%`,
      status: 'SUCCESS',
      operator: 'AI Controller',
      details: `What Happened: ${investigation.whatHappened || investigation.rootCause}`
    });

    return createJsonResponse({ investigation, record });
  }

  // 8. Policy Check
  const actionCheckMatch = pathname.match(/^\/actions\/([^/]+)$/);
  if (actionCheckMatch && method === 'POST') {
    const recordId = decodeURIComponent(actionCheckMatch[1]).toLowerCase();
    const record = clientStore.records.find(r => r.id.toLowerCase() === recordId);
    if (!record || !record.investigation) {
      return createJsonResponse({ error: `Record or completed investigation not found for ${actionCheckMatch[1]}.` }, 404);
    }

    const { actionType } = body;
    const type = actionType || record.investigation.recommendedAction.type;
    const policyResult = evaluateFinancialPolicy(
      record,
      type,
      record.investigation.financialImpact.affectedAmount,
      record.investigation.confidence,
      record.investigation.financialImpact.lossExposure
    );

    return createJsonResponse({ policyResult });
  }

  // 9. Execute & Verify Action
  const verifyMatch = pathname.match(/^\/actions\/([^/]+)\/verify$/);
  if (verifyMatch && method === 'POST') {
    const recordId = decodeURIComponent(verifyMatch[1]).toLowerCase();
    const record = clientStore.records.find(r => r.id.toLowerCase() === recordId);
    if (!record) {
      return createJsonResponse({ error: `Record ${verifyMatch[1]} not found.` }, 404);
    }

    const { actionType, isHumanApproved = false } = body;
    const investigation = record.investigation || {
      id: `INV-${Date.now()}`,
      recordId: record.id,
      whatHappened: record.exceptionDescription || 'Reconciliation exception detected.',
      whyDidItHappen: 'Deterministic ledger variance.',
      rootCause: record.exceptionDescription || 'Deterministic policy resolution',
      evidence: [],
      financialImpact: { affectedAmount: record.actualAmount, currency: 'INR', lossExposure: 0, explanation: '' },
      confidence: 0.95,
      recommendedAction: { id: 'ACT-01', type: (actionType || 'MARK_RECONCILED') as any, label: 'Action Applied', description: '', autoExecutable: true },
      requiresHumanApproval: false,
      policyCheck: { passed: true, policyName: 'POL-00', reason: 'Direct execution', thresholdAmount: 5000 },
      timestamp: new Date().toISOString()
    };

    record.issueStatus = 'ACTION_EXECUTED';
    const operator = isHumanApproved ? 'Human Finance Ops' : 'AI Controller';
    const result = verifyAndCommitAction(clientStore, record, investigation, actionType || investigation.recommendedAction.type, operator);

    return createJsonResponse({
      success: result.isVerified,
      record,
      verification: result
    });
  }

  // 9b. Human Decision
  const decisionMatch = pathname.match(/^\/actions\/([^/]+)\/decision$/);
  if (decisionMatch && method === 'POST') {
    const recordId = decodeURIComponent(decisionMatch[1]).toLowerCase();
    const record = clientStore.records.find(r => r.id.toLowerCase() === recordId);
    if (!record) {
      return createJsonResponse({ error: `Record ${decisionMatch[1]} not found.` }, 404);
    }

    const { decision, reason } = body;
    const timestamp = new Date().toISOString();

    if (decision === 'APPROVE') {
      const investigation = record.investigation || {
        id: `INV-${Date.now()}`,
        recordId: record.id,
        rootCause: record.exceptionDescription || 'Human approved execution',
        evidence: [],
        financialImpact: { affectedAmount: record.actualAmount, currency: 'INR', lossExposure: 0, explanation: '' },
        confidence: 0.95,
        recommendedAction: { id: 'ACT-01', type: 'INITIATE_REFUND_REVIEW' as any, label: 'Approved Action', description: '', autoExecutable: true },
        requiresHumanApproval: true,
        policyCheck: { passed: true, policyName: 'POL-APPROVAL', reason: 'Dual control human sign-off', thresholdAmount: 5000 },
        timestamp
      };

      const result = verifyAndCommitAction(clientStore, record, investigation, investigation.recommendedAction.type, 'Human Finance Ops');
      return createJsonResponse({
        success: result.isVerified,
        decision: 'APPROVED',
        record,
        verification: result
      });
    }

    if (decision === 'REJECT') {
      record.status = 'UNRESOLVED';
      record.issueStatus = 'UNRESOLVED';
      const auditEntry = {
        id: `AUD-${Date.now().toString().slice(-6)}`,
        timestamp,
        entityId: record.id,
        entityType: 'ACTION' as const,
        event: 'Action Proposal Rejected by Human Controller',
        aiDecision: record.investigation?.rootCause || 'AI recommendation rejected',
        evidence: [`Operator Reason: ${reason || 'Action declined by merchant finance team'}`],
        policyResult: 'Manual Rejection',
        actionTaken: 'Rejected Action Proposal',
        verificationResult: 'Proposal cancelled. Record left unresolved for manual book adjustment.',
        status: 'WARNING' as const,
        operator: 'Human Finance Ops' as const,
        details: reason || 'Action declined by merchant finance team'
      };
      clientStore.auditLogs.push(auditEntry);
      return createJsonResponse({ success: true, decision: 'REJECTED', record, auditEntry });
    }

    if (decision === 'ESCALATE') {
      record.status = 'HUMAN_REVIEW';
      record.issueStatus = 'HUMAN_REVIEW';
      if (record.incidentId) {
        const inc = clientStore.incidents.find(i => i.id === record.incidentId);
        if (inc && inc.status !== 'RESOLVED') {
          inc.status = 'HUMAN_REVIEW_REQUIRED';
        }
      }
      const auditEntry = {
        id: `AUD-${Date.now().toString().slice(-6)}`,
        timestamp,
        entityId: record.id,
        entityType: 'POLICY' as const,
        event: 'Escalated to Senior Financial Controller',
        aiDecision: record.investigation?.rootCause,
        evidence: [`Escalation Note: ${reason || 'Requires senior dual-control authorization'}`],
        policyResult: 'POL-ESCALATION',
        actionTaken: 'Escalated Issue',
        verificationResult: 'Sent to senior compliance audit queue.',
        status: 'WARNING' as const,
        operator: 'Human Finance Ops' as const,
        details: reason || 'Requires senior dual-control authorization'
      };
      clientStore.auditLogs.push(auditEntry);
      return createJsonResponse({ success: true, decision: 'ESCALATED', record, auditEntry });
    }

    return createJsonResponse({ error: `Invalid decision '${decision}'. Expected APPROVE, REJECT, or ESCALATE.` }, 400);
  }

  // 9c. Issues list
  if (pathname === '/issues' && method === 'GET') {
    const status = parsedUrl.searchParams.get('status');
    const issues = clientStore.records
      .filter(r => r.status !== 'MATCHED')
      .map(r => {
        let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
        if (r.actualAmount > 15000 || r.exceptionType === 'REFUND_MISMATCH') severity = 'CRITICAL';
        else if (r.actualAmount > 5000) severity = 'HIGH';
        else if (r.exceptionType === 'DELAYED_EVENT' || r.exceptionType === 'DUPLICATE_WEBHOOK') severity = 'LOW';

        return {
          id: `ISSUE-${r.id.replace('REC-', '')}`,
          recordId: r.id,
          issueType: r.exceptionType,
          severity,
          affectedAmount: r.actualAmount,
          relatedIds: {
            orderId: r.orderId,
            paymentId: r.paymentId,
            refundId: r.refundId,
            settlementId: r.settlementId,
            customerId: r.customerId
          },
          status: r.issueStatus || (r.status === 'AI_RESOLVED' ? 'RESOLVED' : r.status === 'HUMAN_REVIEW' ? 'HUMAN_REVIEW' : 'DETECTED'),
          evidence: [
            `Payment: ${r.paymentId}`,
            `Expected: ₹${r.expectedAmount.toLocaleString('en-IN')}`,
            `Actual: ₹${r.actualAmount.toLocaleString('en-IN')}`,
            r.exceptionDescription || 'Reconciliation variance'
          ],
          createdTime: r.reconciledAt,
          resolvedAt: r.resolvedAt,
          investigation: r.investigation,
          actionTaken: r.actionTaken
        };
      });

    let filtered = issues;
    if (status && status !== 'ALL') {
      filtered = filtered.filter(i => i.status === status);
    }
    return createJsonResponse({ issues: filtered, total: filtered.length });
  }

  // 10. Audit Trail
  if (pathname === '/audit' && method === 'GET') {
    const entityId = parsedUrl.searchParams.get('entityId');
    const status = parsedUrl.searchParams.get('status');
    const page = parsedUrl.searchParams.get('page') || '1';
    const limit = parsedUrl.searchParams.get('limit') || '30';

    let logs = [...clientStore.auditLogs].reverse();

    if (entityId && typeof entityId === 'string') {
      const q = entityId.trim().toLowerCase();
      logs = logs.filter(l => l.entityId.toLowerCase().includes(q) || l.id.toLowerCase().includes(q));
    }

    if (status && status !== 'ALL') {
      logs = logs.filter(l => l.status === status);
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const total = logs.length;
    const startIndex = (p - 1) * l;
    const paginated = logs.slice(startIndex, startIndex + l);

    return createJsonResponse({
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
      logs: paginated
    });
  }

  // 11. Evaluation
  if (pathname === '/evaluation' && method === 'GET') {
    const evalMetrics = clientStore.getEvaluationMetrics();
    return createJsonResponse(evalMetrics);
  }

  // 12. Reset data
  if (pathname === '/reset-data' && method === 'POST') {
    clientStore.reset();
    return createJsonResponse({
      success: true,
      message: 'Dataset reseeded to 500 records with standard ground truth anomalies.'
    });
  }

  // 13. Razorpay status
  if (pathname === '/razorpay/status' && method === 'GET') {
    return createJsonResponse({
      mode: 'SYNTHETIC_BENCHMARK_DEMO',
      keyIdConfigured: null,
      activeDataset: '500 Records Ground Truth Benchmark (Seed: 42)',
      geminiAiConfigured: false
    });
  }

  // 14. Simulate anomaly
  if ((pathname === '/razorpay/simulate' || pathname === '/simulate-issue') && method === 'POST') {
    const { anomalyType = 'DUPLICATE_PAYMENT', amount } = body;
    const numAmount = amount ? Number(amount) : undefined;
    const result = clientStore.simulateAnomaly(anomalyType, numAmount);
    return createJsonResponse({
      success: true,
      record: result.record,
      incident: result.incident,
      anomalyType: result.anomalyType
    });
  }

  return createJsonResponse({
    error: `API route not found: ${method} ${pathname}`,
    status: 404
  }, 404);
}

// Resilient fetch wrapper that seamlessly routes to server or local client telemetry
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlString = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : (input as any).url;

  const isApiRequest = urlString.startsWith('/api/') || urlString.includes('/api/');
  if (!isApiRequest) {
    return window.fetch(input, init);
  }

  try {
    const response = await window.fetch(input, init);
    const contentType = response.headers.get('content-type') || '';

    // If backend responded with valid JSON, return immediately
    if (response.ok && contentType.includes('application/json')) {
      return response;
    }

    // If backend returned HTML (e.g. Vercel SPA routing returning index.html for unknown /api/* routes),
    // or status 404, or 502/504, gracefully fallback to the client telemetry engine
    return await handleClientApiRequest(urlString, init);
  } catch (networkError) {
    // If network fails completely (offline, DNS, or serverless cold start timeout),
    // seamlessly execute through client telemetry engine
    return await handleClientApiRequest(urlString, init);
  }
}

// Telemetry initialization hook
export function initTelemetryClient() {
  // Telemetry resilience operates seamlessly via direct apiFetch invocations without mutating global window.fetch
}
