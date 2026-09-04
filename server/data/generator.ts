import {
  Customer,
  Order,
  Payment,
  Refund,
  Settlement,
  WebhookEvent,
  AnomalyType,
  ReconciliationRecord
} from '../../src/types/index.js';

// Deterministic PRNG using Linear Congruential Generator
class SeededRandom {
  private seed: number;

  constructor(seed: number = 42) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}

const CUSTOMER_NAMES = [
  'Aarav Sharma', 'Priya Patel', 'Rohan Gupta', 'Neha Verma', 'Vikram Singh',
  'Ananya Iyer', 'Aditya Nair', 'Kavita Reddy', 'Rahul Joshi', 'Pooja Deshmukh',
  'Siddharth Rao', 'Deepika Menon', 'Amitabh Sengupta', 'Sneha Kulkarni', 'Manish Kapoor',
  'Ritu Choudhury', 'Karan Mehra', 'Divya Bhat', 'Varun Saxena', 'Shruti Mukherjee',
  'Harish Kumar', 'Meera Venkatesh', 'Sanjay Bhatt', 'Tanvi Mathur', 'Gaurav Das'
];

const ITEM_CATEGORIES = [
  'B2B SaaS Subscription - Pro Tier',
  'Cloud Storage Annual License',
  'Developer API Platform Credit',
  'Enterprise Security Module',
  'E-Commerce Retail Order #TX',
  'Merchant POS Hardware Kit',
  'Payroll Software Add-on',
  'Digital Invoicing Fleet License',
  'Logistics Tracking Gateway Fee',
  'Unified Billing Integration Suite'
];

export interface GeneratedDataset {
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
  refunds: Refund[];
  settlements: Settlement[];
  events: WebhookEvent[];
  anomalyMap: Map<string, { type: AnomalyType; description: string; expectedResolution: string }>;
}

export function generateSyntheticDataset(seed: number = 42, count: number = 500): GeneratedDataset {
  const rng = new SeededRandom(seed);
  
  const customers: Customer[] = [];
  const orders: Order[] = [];
  const payments: Payment[] = [];
  const refunds: Refund[] = [];
  const settlements: Settlement[] = [];
  const events: WebhookEvent[] = [];
  const anomalyMap = new Map<string, { type: AnomalyType; description: string; expectedResolution: string }>();

  // Create 40 distinct merchant customers
  for (let i = 1; i <= 40; i++) {
    const name = CUSTOMER_NAMES[(i - 1) % CUSTOMER_NAMES.length] + (i > 25 ? ` (${Math.floor(i / 25) + 1})` : '');
    const id = `cust_${String(1000 + i)}`;
    customers.push({
      id,
      name,
      email: `${name.toLowerCase().replace(/[^a-z]/g, '')}@merchantcorp.in`,
      phone: `+91 98${rng.nextInt(10000000, 99999999)}`,
      tier: i % 7 === 0 ? 'Enterprise' : i % 3 === 0 ? 'Premium' : 'Standard'
    });
  }

  // Predefined anomaly distribution across exactly 53 records
  // 500 records: 447 normal, 53 exceptions
  const anomalyIndices = new Map<number, AnomalyType>();
  const anomalyPlan: { type: AnomalyType; count: number }[] = [
    { type: 'DUPLICATE_PAYMENT', count: 12 },
    { type: 'SETTLEMENT_MISMATCH', count: 7 },
    { type: 'DELAYED_EVENT', count: 6 },
    { type: 'OUT_OF_ORDER_EVENT', count: 5 },
    { type: 'PAYMENT_AMOUNT_MISMATCH', count: 6 },
    { type: 'REFUND_MISMATCH', count: 4 },
    { type: 'DUPLICATE_WEBHOOK', count: 4 },
    { type: 'MISSING_EVENT', count: 3 },
    { type: 'MISSING_SETTLEMENT', count: 3 },
    { type: 'AMBIGUOUS_STATE', count: 3 }
  ];

  // Distribute anomaly indexes reproducibly across 1..500
  let assigned = 0;
  const spreadFactor = Math.floor(count / 53);
  let currentIndex = 7; // start slightly offset
  for (const item of anomalyPlan) {
    for (let c = 0; c < item.count; c++) {
      anomalyIndices.set(currentIndex, item.type);
      currentIndex += spreadFactor + ((c % 2 === 0) ? 1 : -1);
      if (currentIndex > count) currentIndex = (currentIndex % count) + 3;
      assigned++;
    }
  }

  // Generate records
  const baseDate = new Date('2026-08-25T08:00:00.000Z');
  let currentSettlementBatch: Payment[] = [];
  let settlementIndex = 101;

  for (let i = 1; i <= count; i++) {
    const recordNum = i;
    const customer = customers[rng.nextInt(0, customers.length - 1)];
    const orderId = `order_${String(10000 + i)}`;
    const paymentId = `pay_${String(80000 + i)}`;
    const anomaly = anomalyIndices.get(recordNum) || 'NONE';

    // Standard amounts: ₹499, ₹1,200, ₹2,500, ₹4,800, ₹7,500, ₹10,000, ₹15,000, ₹24,000
    const amountsPool = [499, 1200, 1999, 2500, 4800, 7500, 8500, 10000, 12500, 15000, 18400, 24000];
    const orderAmount = rng.pick(amountsPool);
    const timeOffsetMinutes = i * 18 + rng.nextInt(1, 10);
    const recordTime = new Date(baseDate.getTime() + timeOffsetMinutes * 60000);
    const timeStr = recordTime.toISOString();

    const order: Order = {
      id: orderId,
      customerId: customer.id,
      amount: orderAmount,
      currency: 'INR',
      receipt: `rcpt_${String(9000 + i)}`,
      status: 'paid',
      createdAt: timeStr,
      itemsSummary: rng.pick(ITEM_CATEGORIES)
    };

    // Razorpay standard MDR fee: 2% + 18% GST on fee = 2.36%
    const standardFee = Math.round(orderAmount * 0.02 * 100) / 100;
    const standardTax = Math.round(standardFee * 0.18 * 100) / 100;
    const standardNet = Math.round((orderAmount - standardFee - standardTax) * 100) / 100;

    let paymentAmount = orderAmount;
    let paymentFee = standardFee;
    let paymentTax = standardTax;
    let paymentNet = standardNet;
    let paymentStatus: Payment['status'] = 'captured';
    let isDuplicate = false;
    let capturedAtStr = new Date(recordTime.getTime() + 120000).toISOString(); // 2 mins later

    const paymentMethod: Payment['method'] = rng.pick(['upi', 'card', 'netbanking', 'wallet']);
    const methodDetails = paymentMethod === 'upi' ? `${customer.name.toLowerCase().replace(/[^a-z]/g, '')}@okhdfcbank`
      : paymentMethod === 'card' ? `HDFC Visa ending ${rng.nextInt(1000, 9999)}`
      : paymentMethod === 'netbanking' ? 'ICICI NetBanking' : 'Razorpay Wallet';

    // Apply specific anomaly injection logic
    if (anomaly === 'DUPLICATE_PAYMENT') {
      // Duplicate payment: First attempt had a gateway timeout, customer retried 3 mins later, both got charged!
      isDuplicate = true;
      anomalyMap.set(paymentId, {
        type: 'DUPLICATE_PAYMENT',
        description: `Duplicate charge detected for Order ${orderId}. Initial payment pay_${String(80000 + i)}_orig and retry ${paymentId} were both captured.`,
        expectedResolution: 'Initiate automatic refund review for duplicate charge'
      });
    } else if (anomaly === 'PAYMENT_AMOUNT_MISMATCH') {
      // Order was ₹10,000 but payment captured ₹8,500 due to currency exchange or unverified coupon
      paymentAmount = Math.max(100, orderAmount - rng.pick([500, 1000, 1500, 2000]));
      paymentFee = Math.round(paymentAmount * 0.02 * 100) / 100;
      paymentTax = Math.round(paymentFee * 0.18 * 100) / 100;
      paymentNet = Math.round((paymentAmount - paymentFee - paymentTax) * 100) / 100;
      anomalyMap.set(paymentId, {
        type: 'PAYMENT_AMOUNT_MISMATCH',
        description: `Payment captured (₹${paymentAmount.toLocaleString('en-IN')}) does not match Order amount (₹${orderAmount.toLocaleString('en-IN')}). Shortfall: ₹${(orderAmount - paymentAmount).toLocaleString('en-IN')}.`,
        expectedResolution: 'Notify merchant of underpayment / adjust invoice'
      });
    } else if (anomaly === 'AMBIGUOUS_STATE') {
      paymentStatus = 'authorized';
      capturedAtStr = undefined as any;
      anomalyMap.set(paymentId, {
        type: 'AMBIGUOUS_STATE',
        description: `Payment ${paymentId} remained in 'authorized' state past the 7-day auto-capture window without void or capture.`,
        expectedResolution: 'Escalate to human review to verify gateway settlement state'
      });
    }

    const payment: Payment = {
      id: paymentId,
      orderId,
      customerId: customer.id,
      amount: paymentAmount,
      fee: paymentFee,
      tax: paymentTax,
      netAmount: paymentNet,
      status: paymentStatus,
      method: paymentMethod,
      methodDetails,
      createdAt: timeStr,
      capturedAt: capturedAtStr,
      bankRrn: `${rng.nextInt(50000000, 99999999)}4201`,
      isDuplicate
    };

    orders.push(order);
    payments.push(payment);

    // Event lifecycles
    const eventCreated: WebhookEvent = {
      id: `evt_${String(700000 + i * 4 + 1)}`,
      event: 'payment.authorized',
      entityId: paymentId,
      timestamp: timeStr,
      deliveryStatus: 'delivered',
      latencyMs: 140,
      payloadSnippet: JSON.stringify({ id: paymentId, amount: paymentAmount, status: 'authorized', order_id: orderId })
    };
    events.push(eventCreated);

    let eventCaptured: WebhookEvent = {
      id: `evt_${String(700000 + i * 4 + 2)}`,
      event: 'payment.captured',
      entityId: paymentId,
      timestamp: capturedAtStr || timeStr,
      deliveryStatus: 'delivered',
      latencyMs: 210,
      payloadSnippet: JSON.stringify({ id: paymentId, amount: paymentAmount, status: 'captured', order_id: orderId })
    };

    if (anomaly === 'DELAYED_EVENT') {
      // Webhook delivered 45 minutes late after merchant inventory timeout
      const lateTime = new Date(recordTime.getTime() + 45 * 60000).toISOString();
      eventCaptured.timestamp = lateTime;
      eventCaptured.deliveryStatus = 'delayed';
      eventCaptured.latencyMs = 2700000;
      anomalyMap.set(paymentId, {
        type: 'DELAYED_EVENT',
        description: `payment.captured webhook arrived with 45m latency (2,700,000ms), causing temporary mismatch with merchant order status.`,
        expectedResolution: 'Mark reconciled after verifying gateway RRN timestamp'
      });
    } else if (anomaly === 'OUT_OF_ORDER_EVENT') {
      // payment.failed webhook arrived after payment.captured due to network retry
      const outOfOrderTime = new Date(recordTime.getTime() + 180000).toISOString();
      const failedEvt: WebhookEvent = {
        id: `evt_${String(700000 + i * 4 + 3)}`,
        event: 'payment.failed',
        entityId: paymentId,
        timestamp: outOfOrderTime,
        deliveryStatus: 'delivered',
        latencyMs: 350,
        payloadSnippet: JSON.stringify({ id: paymentId, amount: paymentAmount, status: 'failed', code: 'GATEWAY_TIMEOUT_RETRY' })
      };
      events.push(failedEvt);
      anomalyMap.set(paymentId, {
        type: 'OUT_OF_ORDER_EVENT',
        description: `Received payment.failed after payment.captured due to asynchronous upstream bank network retry.`,
        expectedResolution: 'Verify capture ledger state and dismiss obsolete failure event'
      });
    } else if (anomaly === 'DUPLICATE_WEBHOOK') {
      // Duplicate webhook delivered twice
      const dupEvt: WebhookEvent = {
        id: `evt_${String(700000 + i * 4 + 4)}`,
        event: 'payment.captured',
        entityId: paymentId,
        timestamp: capturedAtStr || timeStr,
        deliveryStatus: 'duplicate',
        latencyMs: 240,
        payloadSnippet: JSON.stringify({ id: paymentId, amount: paymentAmount, status: 'captured', signature: 'dup_sig' })
      };
      events.push(dupEvt);
      anomalyMap.set(paymentId, {
        type: 'DUPLICATE_WEBHOOK',
        description: `payment.captured webhook delivered multiple times with identical signature, triggering redundant ledger entries.`,
        expectedResolution: 'Deduplicate webhook event and sync single ledger entry'
      });
    } else if (anomaly === 'MISSING_EVENT') {
      // Missing webhook event (dropped in transit)
      eventCaptured.deliveryStatus = 'dropped';
      anomalyMap.set(paymentId, {
        type: 'MISSING_EVENT',
        description: `payment.captured event was dropped in network transit. Payment exists in gateway but missing in local event stream.`,
        expectedResolution: 'Fetch status directly from Razorpay Test API / gateway RRN'
      });
    }

    if (paymentStatus === 'captured') {
      events.push(eventCaptured);
    }

    // Refund logic (for ~5% of records or REFUND_MISMATCH)
    let refundId: string | undefined = undefined;
    if (anomaly === 'REFUND_MISMATCH' || (i % 19 === 0 && anomaly === 'NONE')) {
      refundId = `rfnd_${String(60000 + i)}`;
      let refundAmount = orderAmount;
      
      if (anomaly === 'REFUND_MISMATCH') {
        // Refund amount exceeds payment or refund double processed
        refundAmount = orderAmount + rng.pick([500, 1200, 2500]);
        anomalyMap.set(paymentId, {
          type: 'REFUND_MISMATCH',
          description: `Refund amount (₹${refundAmount.toLocaleString('en-IN')}) exceeds original payment captured (₹${paymentAmount.toLocaleString('en-IN')}).`,
          expectedResolution: 'Flag refund discrepancy for human compliance approval'
        });
      }

      const refund: Refund = {
        id: refundId,
        paymentId,
        orderId,
        amount: refundAmount,
        status: 'processed',
        speed: 'optimum',
        reason: 'Customer requested cancellation',
        createdAt: new Date(recordTime.getTime() + 3600000).toISOString(),
        processedAt: new Date(recordTime.getTime() + 3700000).toISOString()
      };
      refunds.push(refund);
      
      events.push({
        id: `evt_${String(750000 + i)}`,
        event: 'refund.processed',
        entityId: refundId,
        timestamp: refund.processedAt!,
        deliveryStatus: 'delivered',
        latencyMs: 180,
        payloadSnippet: JSON.stringify({ id: refundId, payment_id: paymentId, amount: refundAmount })
      });
    }

    // Settlement handling
    // MISSING_SETTLEMENT: intentionally omit from any settlement batch (truly missing).
    // SETTLEMENT_MISMATCH: isolate into a dedicated single-payment settlement so the
    // batch-level discrepancy does not contaminate unrelated sibling payments.
    if (paymentStatus === 'captured' && anomaly === 'MISSING_SETTLEMENT') {
      anomalyMap.set(paymentId, {
        type: 'MISSING_SETTLEMENT',
        description: `Payment captured 7 days ago but settlement cycle T+2 missed. UTR pending from nodal bank.`,
        expectedResolution: 'Escalate to human operations for bank nodal account inquiry'
      });
    } else if (paymentStatus === 'captured' && anomaly === 'SETTLEMENT_MISMATCH') {
      settlementIndex++;
      const sId = `setl_${String(settlementIndex)}`;
      const diff = rng.pick([350, 480, 720, 1150]);
      const net = Math.round((paymentAmount - paymentFee - paymentTax - diff) * 100) / 100;
      anomalyMap.set(paymentId, {
        type: 'SETTLEMENT_MISMATCH',
        description: `Settlement payout ₹${net.toLocaleString('en-IN')} has an unmapped fee variance of ₹${diff} against expected ₹${(net + diff).toLocaleString('en-IN')}.`,
        expectedResolution: 'Auto-adjust settlement fee variance to unapplied interchange fee'
      });
      settlements.push({
        id: sId,
        paymentIds: [paymentId],
        grossAmount: paymentAmount,
        feesDeducted: paymentFee,
        taxDeducted: paymentTax,
        netSettled: net,
        utr: `UTR${rng.nextInt(100000, 999999)}AXIS${rng.nextInt(1000, 9999)}`,
        status: 'settled',
        settledAt: new Date(recordTime.getTime() + 24 * 3600000).toISOString(),
        discrepancyNote: `Bank settlement short by ₹${diff} due to unapplied interchange adjustment.`
      });
    } else if (paymentStatus === 'captured') {
      // Batch settlements every 10 normal payments (T+1 or T+2 settlement cycle)
      currentSettlementBatch.push(payment);
      if (currentSettlementBatch.length >= 10 || i === count) {
        const batchPayments = [...currentSettlementBatch];
        currentSettlementBatch = [];
        settlementIndex++;
        const sId = `setl_${String(settlementIndex)}`;

        const gross = batchPayments.reduce((acc, p) => acc + p.amount, 0);
        const fees = batchPayments.reduce((acc, p) => acc + p.fee, 0);
        const tax = batchPayments.reduce((acc, p) => acc + p.tax, 0);
        const net = Math.round((gross - fees - tax) * 100) / 100;

        settlements.push({
          id: sId,
          paymentIds: batchPayments.map(p => p.id),
          grossAmount: gross,
          feesDeducted: fees,
          taxDeducted: tax,
          netSettled: net,
          utr: `UTR${rng.nextInt(100000, 999999)}AXIS${rng.nextInt(1000, 9999)}`,
          status: 'settled',
          settledAt: new Date(recordTime.getTime() + 24 * 3600000).toISOString()
        });
      }
    }
  }

  // Flush any remaining payments that didn't fill a complete settlement batch
  if (currentSettlementBatch.length > 0) {
    settlementIndex++;
    const sId = `setl_${String(settlementIndex)}`;
    const batchPayments = [...currentSettlementBatch];
    currentSettlementBatch = [];
    const gross = batchPayments.reduce((acc, p) => acc + p.amount, 0);
    const fees = batchPayments.reduce((acc, p) => acc + p.fee, 0);
    const tax = batchPayments.reduce((acc, p) => acc + p.tax, 0);
    const net = Math.round((gross - fees - tax) * 100) / 100;
    settlements.push({
      id: sId,
      paymentIds: batchPayments.map(p => p.id),
      grossAmount: gross,
      feesDeducted: fees,
      taxDeducted: tax,
      netSettled: net,
      utr: `UTR${rng.nextInt(100000, 999999)}AXIS${rng.nextInt(1000, 9999)}`,
      status: 'settled',
      settledAt: new Date(baseDate.getTime() + count * 18 * 60000 + 24 * 3600000).toISOString()
    });
  }

  return {
    customers,
    orders,
    payments,
    refunds,
    settlements,
    events,
    anomalyMap
  };
}
