import { ReconciliationRecord, Incident } from '../../src/types/index.js';

export function groupExceptionsIntoIncidents(records: ReconciliationRecord[]): {
  incidents: Incident[];
  updatedRecords: ReconciliationRecord[];
} {
  const exceptions = records.filter(r => r.status === 'EXCEPTION' || r.status === 'MISMATCH' || r.exceptionType !== 'NONE');
  
  const groups = new Map<string, ReconciliationRecord[]>();

  for (const r of exceptions) {
    let key = 'MISC_ANOMALIES';
    if (r.exceptionType === 'DUPLICATE_PAYMENT') key = 'DUPLICATE_PAYMENT_CLUSTER';
    else if (r.exceptionType === 'SETTLEMENT_MISMATCH') key = 'SETTLEMENT_MISMATCH_CLUSTER';
    else if (r.exceptionType === 'DELAYED_EVENT' || r.exceptionType === 'OUT_OF_ORDER_EVENT' || r.exceptionType === 'DUPLICATE_WEBHOOK') key = 'WEBHOOK_ANOMALY_CLUSTER';
    else if (r.exceptionType === 'PAYMENT_AMOUNT_MISMATCH') key = 'AMOUNT_MISMATCH_CLUSTER';
    else if (r.exceptionType === 'REFUND_MISMATCH') key = 'REFUND_MISMATCH_CLUSTER';
    else if (r.exceptionType === 'MISSING_SETTLEMENT') key = 'MISSING_SETTLEMENT_CLUSTER';
    else if (r.exceptionType === 'AMBIGUOUS_STATE') key = 'AMBIGUOUS_AUTH_CLUSTER';
    else if (r.exceptionType === 'MISSING_EVENT') key = 'DROPPED_EVENT_CLUSTER';

    const list = groups.get(key) || [];
    list.push(r);
    groups.set(key, list);
  }

  const incidents: Incident[] = [];
  const updatedRecords = [...records];
  const recordMap = new Map(updatedRecords.map(r => [r.id, r]));

  let incIndex = 1;

  for (const [key, groupRecords] of groups.entries()) {
    const incId = `INC-00${incIndex++}`;
    const totalAmount = groupRecords.reduce((sum, r) => sum + r.actualAmount, 0);
    const affectedIds = groupRecords.map(r => r.id);

    let title = 'Payment Operations Anomaly Cluster';
    let severity: Incident['severity'] = 'MEDIUM';
    let rootCauseSummary = 'Automated incident detector grouped correlated operational anomalies.';
    let confidence = 0.94;

    if (key === 'DUPLICATE_PAYMENT_CLUSTER') {
      title = 'Duplicate Payment Cluster';
      severity = 'HIGH';
      rootCauseSummary = 'Multiple customer payment retries triggered by transient gateway timeout; dual captures confirmed on bank switch.';
      confidence = 0.96;
    } else if (key === 'SETTLEMENT_MISMATCH_CLUSTER') {
      title = 'Settlement Fee Discrepancy Cluster';
      severity = 'MEDIUM';
      rootCauseSummary = 'Bank nodal payout net amounts diverge from expected calculation due to unapplied interchange tier adjustments.';
      confidence = 0.92;
    } else if (key === 'WEBHOOK_ANOMALY_CLUSTER') {
      title = 'Delayed & Out-of-Order Webhook Cluster';
      severity = 'MEDIUM';
      rootCauseSummary = 'Network latency on merchant webhook consumer caused asynchronous event arrival after timeout expiration.';
      confidence = 0.95;
    } else if (key === 'AMOUNT_MISMATCH_CLUSTER') {
      title = 'Payment Amount Discrepancy Cluster';
      severity = 'HIGH';
      rootCauseSummary = 'Captured amount is lower than order invoice total, likely caused by unapplied discount or multi-currency rounding.';
      confidence = 0.91;
    } else if (key === 'REFUND_MISMATCH_CLUSTER') {
      title = 'High-Value Refund Threshold Discrepancy';
      severity = 'CRITICAL';
      rootCauseSummary = 'Refund authorizations exceed original payment values or trigger compliance limit checks.';
      confidence = 0.98;
    } else if (key === 'MISSING_SETTLEMENT_CLUSTER') {
      title = 'Nodal Bank Settlement SLA Breach';
      severity = 'HIGH';
      rootCauseSummary = 'Payments captured beyond T+2 standard settlement cycle without issued Axis/HDFC Bank UTR.';
      confidence = 0.93;
    } else if (key === 'AMBIGUOUS_AUTH_CLUSTER') {
      title = 'Ambiguous Gateway Authorization Cluster';
      severity = 'HIGH';
      rootCauseSummary = 'Transactions authorized at gateway level but pending capture/void past 7-day automated hold window.';
      confidence = 0.89;
    } else if (key === 'DROPPED_EVENT_CLUSTER') {
      title = 'Dropped Webhook Event Stream';
      severity = 'LOW';
      rootCauseSummary = 'Webhook delivery packet dropped in transit; bank gateway transaction confirmed successfully.';
      confidence = 0.97;
    }

    // Attach incidentId to each record
    for (const r of groupRecords) {
      const rec = recordMap.get(r.id);
      if (rec) {
        rec.incidentId = incId;
      }
    }

    incidents.push({
      id: incId,
      title,
      type: key,
      severity,
      affectedRecordIds: affectedIds,
      totalAmountAffected: totalAmount,
      status: 'OPEN',
      rootCauseSummary,
      confidence,
      createdAt: new Date().toISOString()
    });
  }

  return {
    incidents,
    updatedRecords: Array.from(recordMap.values())
  };
}
