import {
  Payment,
  Refund,
  Settlement,
  WebhookEvent,
  ReconciliationRecord,
  RecordStatus,
  IssueStatus
} from '../../src/types/index.js';
import { FinancialStore } from '../store.js';

export interface ActionExecutionResult {
  success: boolean;
  actionType: string;
  affectedEntityId: string;
  executionSummary: string;
  generatedRecords: {
    refund?: Refund;
    settlement?: Settlement;
    events: WebhookEvent[];
  };
}

export function executeSafeAction(
  store: FinancialStore,
  record: ReconciliationRecord,
  actionType: string,
  operator: 'AI Controller' | 'Human Finance Ops'
): ActionExecutionResult {
  const payment = store.payments.find(p => p.id.toLowerCase() === record.paymentId.toLowerCase());
  const order = store.orders.find(o => o.id.toLowerCase() === record.orderId.toLowerCase());
  const generatedEvents: WebhookEvent[] = [];

  const timestamp = new Date().toISOString();

  if (actionType === 'INITIATE_REFUND_REVIEW' || actionType === 'REFUND_DUPLICATE_PAYMENT') {
    if (!payment) {
      throw new Error(`Payment ${record.paymentId} not found in live store.`);
    }

    // Special case: Refund Mismatch where refund already exceeds payment
    if (record.exceptionType === 'REFUND_MISMATCH') {
      const existingRefunds = store.refunds.filter(r => r.paymentId.toLowerCase() === payment.id.toLowerCase());
      if (existingRefunds.length > 0) {
        const totalRefunded = existingRefunds.reduce((s, r) => s + r.amount, 0);
        const overage = totalRefunded - payment.amount;
        const lastRefund = existingRefunds[existingRefunds.length - 1];
        lastRefund.amount = Math.max(0, lastRefund.amount - overage);
        store.anomalyMap.delete(record.paymentId);
        return {
          success: true,
          actionType,
          affectedEntityId: lastRefund.id,
          executionSummary: `Refund ${lastRefund.id} adjusted by -₹${overage.toLocaleString('en-IN')}. Total refunds now capped at payment capture amount ₹${payment.amount.toLocaleString('en-IN')}. Ledger variance cleared.`,
          generatedRecords: {
            refund: lastRefund,
            events: []
          }
        };
      }
    }

    // 1. Create real Refund record
    const refundId = `rfnd_${String(Date.now()).slice(-6)}`;
    const refund: Refund = {
      id: refundId,
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      status: 'processed',
      speed: 'optimum',
      reason: 'Duplicate payment reversal via Control Tower',
      createdAt: timestamp,
      processedAt: timestamp
    };
    store.refunds.push(refund);

    // 2. Update payment status in synthetic dataset
    payment.status = 'refunded';
    store.anomalyMap.delete(payment.id);

    // 3. Emit webhook event
    const refundEvent: WebhookEvent = {
      id: `evt_rfnd_${Date.now().toString().slice(-6)}`,
      event: 'refund.processed',
      entityId: refundId,
      timestamp,
      deliveryStatus: 'delivered',
      latencyMs: 85,
      payloadSnippet: JSON.stringify({ id: refundId, payment_id: payment.id, amount: refund.amount, status: 'processed' })
    };
    store.events.push(refundEvent);
    generatedEvents.push(refundEvent);

    record.refundId = refundId;

    return {
      success: true,
      actionType,
      affectedEntityId: payment.id,
      executionSummary: `Refund ${refundId} of ₹${refund.amount.toLocaleString('en-IN')} issued back to customer source VPA. Payment status updated to 'refunded'.`,
      generatedRecords: {
        refund,
        events: generatedEvents
      }
    };
  }

  if (actionType === 'ADJUST_SETTLEMENT_FEE' || actionType === 'RETRY_SETTLEMENT') {
    let settlement = store.settlements.find(s => s.paymentIds.some(p => p.toLowerCase() === record.paymentId.toLowerCase()));
    
    if (!settlement) {
      // Create missing settlement
      const settlementId = `setl_${String(Date.now()).slice(-6)}`;
      settlement = {
        id: settlementId,
        paymentIds: [record.paymentId],
        grossAmount: record.actualAmount,
        feesDeducted: Math.round(record.actualAmount * 0.02 * 100) / 100,
        taxDeducted: Math.round(record.actualAmount * 0.02 * 0.18 * 100) / 100,
        netSettled: Math.round((record.actualAmount * 0.9764) * 100) / 100,
        utr: `AXISCN${Math.floor(Math.random() * 89999999 + 10000000)}`,
        status: 'settled',
        settledAt: timestamp
      };
      store.settlements.push(settlement);
      record.settlementId = settlementId;
    } else {
      // Clear discrepancy note and update status
      settlement.discrepancyNote = undefined;
      settlement.status = 'settled';
      settlement.settledAt = timestamp;
    }

    store.anomalyMap.delete(record.paymentId);

    const settlementEvent: WebhookEvent = {
      id: `evt_setl_${Date.now().toString().slice(-6)}`,
      event: 'settlement.processed',
      entityId: settlement.id,
      timestamp,
      deliveryStatus: 'delivered',
      latencyMs: 120,
      payloadSnippet: JSON.stringify({ id: settlement.id, utr: settlement.utr, net: settlement.netSettled, status: 'settled' })
    };
    store.events.push(settlementEvent);
    generatedEvents.push(settlementEvent);

    return {
      success: true,
      actionType,
      affectedEntityId: settlement.id,
      executionSummary: `Nodal settlement ${settlement.id} adjusted and processed. UTR: ${settlement.utr}, net payout: ₹${settlement.netSettled.toLocaleString('en-IN')}. Discrepancy cleared.`,
      generatedRecords: {
        settlement,
        events: generatedEvents
      }
    };
  }

  if (actionType === 'NOTIFY_MERCHANT') {
    if (order && payment && (record.exceptionType === 'PAYMENT_AMOUNT_MISMATCH' || record.difference !== 0)) {
      const diff = Math.abs(order.amount - payment.amount);
      order.amount = payment.amount;
      order.itemsSummary = `${order.itemsSummary} (Invoice voucher applied: ₹${diff.toLocaleString('en-IN')})`;
      store.anomalyMap.delete(record.paymentId);
      return {
        success: true,
        actionType,
        affectedEntityId: order.id,
        executionSummary: `Merchant invoice adjustment notice confirmed. Applied invoice voucher of ₹${diff.toLocaleString('en-IN')} to Order ${order.id}. Order and payment amounts now synchronized at ₹${payment.amount.toLocaleString('en-IN')}.`,
        generatedRecords: {
          events: []
        }
      };
    }

    store.anomalyMap.delete(record.paymentId);

    return {
      success: true,
      actionType,
      affectedEntityId: record.id,
      executionSummary: `Merchant notification dispatched regarding ₹${Math.abs(record.difference).toLocaleString('en-IN')} invoice variance. Customer account flagged for invoice balance adjustment.`,
      generatedRecords: {
        events: []
      }
    };
  }

  if (actionType === 'FLAG_TRANSACTION') {
    if (payment) {
      payment.status = 'authorized';
    }
    return {
      success: true,
      actionType,
      affectedEntityId: record.paymentId,
      executionSummary: `Transaction ${record.paymentId} flagged and placed on compliance payout freeze pending merchant verification.`,
      generatedRecords: {
        events: []
      }
    };
  }

  if (actionType === 'ESCALATE_HUMAN') {
    return {
      success: true,
      actionType,
      affectedEntityId: record.id,
      executionSummary: `Ticket escalated to Senior Operations Desk. Full forensic evidence snapshot compiled for review.`,
      generatedRecords: {
        events: []
      }
    };
  }

  // Fallback MARK_RECONCILED
  const paymentEvents = store.events.filter(e => e.entityId.toLowerCase() === record.paymentId.toLowerCase());
  for (const evt of paymentEvents) {
    if (evt.deliveryStatus === 'delayed') {
      evt.deliveryStatus = 'delivered';
      evt.latencyMs = 150;
    }
  }
  const hasCaptured = paymentEvents.some(e => e.event === 'payment.captured');
  if (hasCaptured) {
    const failedEvt = paymentEvents.find(e => e.event === 'payment.failed');
    if (failedEvt) {
      failedEvt.deliveryStatus = 'dropped';
    }
  }

  store.anomalyMap.delete(record.paymentId);

  return {
    success: true,
    actionType: 'MARK_RECONCILED',
    affectedEntityId: record.id,
    executionSummary: `Deterministic matching rule reapplied. Gateway RRN verified and event timeline synchronized with zero residual variance.`,
    generatedRecords: {
      events: []
    }
  };
}
