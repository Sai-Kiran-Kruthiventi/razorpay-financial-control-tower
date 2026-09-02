import {
  Payment,
  Order,
  Refund,
  Settlement,
  WebhookEvent,
  TimelineNode
} from '../../src/types/index.js';
import { FinancialStore, globalStore } from '../store.js';

export interface BackendInvestigationTools {
  getPayment(paymentId: string): Payment | null;
  getRelatedPayments(orderId: string): Payment[];
  getOrder(orderId: string): Order | null;
  getRefunds(paymentId: string): Refund[];
  getSettlement(paymentId: string): Settlement | null;
  getEventTimeline(paymentId: string): WebhookEvent[];
  getRelatedTransactions(transactionId: string): {
    order?: Order;
    payments: Payment[];
    refunds: Refund[];
    settlement?: Settlement;
  };
}

export class StoreInvestigationTools implements BackendInvestigationTools {
  constructor(private store: FinancialStore = globalStore) {}

  getPayment(paymentId: string): Payment | null {
    if (!paymentId) return null;
    const normalized = paymentId.trim().toLowerCase();
    const found = this.store.payments.find(p => p.id.toLowerCase() === normalized);
    return found ? { ...found } : null;
  }

  getRelatedPayments(orderId: string): Payment[] {
    if (!orderId) return [];
    const normalized = orderId.trim().toLowerCase();
    return this.store.payments
      .filter(p => p.orderId.toLowerCase() === normalized)
      .map(p => ({ ...p }));
  }

  getOrder(orderId: string): Order | null {
    if (!orderId) return null;
    const normalized = orderId.trim().toLowerCase();
    const found = this.store.orders.find(o => o.id.toLowerCase() === normalized);
    return found ? { ...found } : null;
  }

  getRefunds(paymentId: string): Refund[] {
    if (!paymentId) return [];
    const normalized = paymentId.trim().toLowerCase();
    return this.store.refunds
      .filter(r => r.paymentId.toLowerCase() === normalized)
      .map(r => ({ ...r }));
  }

  getSettlement(paymentId: string): Settlement | null {
    if (!paymentId) return null;
    const normalized = paymentId.trim().toLowerCase();
    const found = this.store.settlements.find(s =>
      s.paymentIds.some(p => p.toLowerCase() === normalized)
    );
    return found ? { ...found } : null;
  }

  getEventTimeline(paymentId: string): WebhookEvent[] {
    if (!paymentId) return [];
    const normalized = paymentId.trim().toLowerCase();
    const paymentRefunds = this.getRefunds(paymentId);
    const refundIds = new Set(paymentRefunds.map(r => r.id.toLowerCase()));

    return this.store.events
      .filter(e => e.entityId.toLowerCase() === normalized || refundIds.has(e.entityId.toLowerCase()))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(e => ({ ...e }));
  }

  getRelatedTransactions(transactionId: string): {
    order?: Order;
    payments: Payment[];
    refunds: Refund[];
    settlement?: Settlement;
  } {
    if (!transactionId) {
      return { payments: [], refunds: [] };
    }

    const q = transactionId.trim().toLowerCase();
    let order: Order | undefined;
    let payments: Payment[] = [];
    let refunds: Refund[] = [];
    let settlement: Settlement | undefined;

    // Check if q is a payment ID
    const directPayment = this.getPayment(q);
    if (directPayment) {
      payments = this.getRelatedPayments(directPayment.orderId);
      if (payments.length === 0) payments = [directPayment];
      order = this.getOrder(directPayment.orderId) || undefined;
      refunds = this.getRefunds(directPayment.id);
      settlement = this.getSettlement(directPayment.id) || undefined;
      return { order, payments, refunds, settlement };
    }

    // Check if q is an order ID
    const directOrder = this.getOrder(q);
    if (directOrder) {
      order = directOrder;
      payments = this.getRelatedPayments(directOrder.id);
      for (const p of payments) {
        refunds.push(...this.getRefunds(p.id));
        if (!settlement) {
          settlement = this.getSettlement(p.id) || undefined;
        }
      }
      return { order, payments, refunds, settlement };
    }

    // Check if q is a refund ID
    const directRefund = this.store.refunds.find(r => r.id.toLowerCase() === q);
    if (directRefund) {
      const p = this.getPayment(directRefund.paymentId);
      if (p) {
        payments = this.getRelatedPayments(p.orderId);
        order = this.getOrder(p.orderId) || undefined;
        settlement = this.getSettlement(p.id) || undefined;
      }
      refunds = [directRefund];
      return { order, payments, refunds, settlement };
    }

    return { order, payments, refunds, settlement };
  }
}

export const investigationTools = new StoreInvestigationTools();
