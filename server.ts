import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { globalStore } from './server/store.js';
import { investigateExceptionWithAI } from './server/ai/controller.js';
import { evaluateFinancialPolicy } from './server/engine/policyEngine.js';
import { verifyAndCommitAction } from './server/engine/verifier.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Handle invalid JSON in request body gracefully
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Malformed JSON payload in request body.' });
    }
    next(err);
  });

  // 1. Dashboard metrics endpoint
  app.get('/api/dashboard', (req, res) => {
    try {
      const metrics = globalStore.getDashboardMetrics();
      res.json(metrics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Reconciliation records endpoint (with filtering, search & pagination)
  app.get('/api/reconciliation', (req, res) => {
    try {
      const { status, exceptionType, search, page = '1', limit = '25' } = req.query;
      let filtered = [...globalStore.records];

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

      const p = Math.max(1, parseInt(page as string, 10) || 1);
      const l = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
      const total = filtered.length;
      const startIndex = (p - 1) * l;
      const paginated = filtered.slice(startIndex, startIndex + l);

      res.json({
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
        records: paginated
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Single reconciliation record
  app.get('/api/reconciliation/:id', (req, res) => {
    try {
      const record = globalStore.records.find(r => r.id.toLowerCase() === req.params.id.toLowerCase());
      if (!record) {
        return res.status(404).json({ error: `Record ${req.params.id} not found.` });
      }

      const order = globalStore.orders.find(o => o.id === record.orderId);
      const payment = globalStore.payments.find(p => p.id === record.paymentId);
      const refund = record.refundId ? globalStore.refunds.find(r => r.id === record.refundId) : undefined;
      const settlement = record.settlementId ? globalStore.settlements.find(s => s.id === record.settlementId) : undefined;
      const events = globalStore.events.filter(e => e.entityId === record.paymentId || (refund && e.entityId === refund.id));

      res.json({
        record,
        order,
        payment,
        refund,
        settlement,
        events
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Incidents list
  app.get('/api/incidents', (req, res) => {
    try {
      res.json({ incidents: globalStore.incidents });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Single incident detail
  app.get('/api/incidents/:id', (req, res) => {
    try {
      const incident = globalStore.incidents.find(i => i.id.toLowerCase() === req.params.id.toLowerCase());
      if (!incident) {
        return res.status(404).json({ error: `Incident ${req.params.id} not found.` });
      }
      const affectedRecords = globalStore.records.filter(r => incident.affectedRecordIds.includes(r.id));
      res.json({ incident, affectedRecords });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Explain This Money / Transaction lifecycle reconstruction
  app.get('/api/transactions/:id', (req, res) => {
    try {
      const result = globalStore.getFinancialLifecycle(req.params.id);
      if (!result) {
        return res.status(404).json({ error: `No transaction lifecycle found for '${req.params.id}'. Try searching by Order ID (e.g. order_10007), Payment ID (e.g. pay_80007), or Record ID (e.g. REC-007).` });
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. AI Investigation endpoint
  app.post('/api/investigate/:id', async (req, res) => {
    try {
      const record = globalStore.records.find(r => r.id.toLowerCase() === req.params.id.toLowerCase() || r.paymentId.toLowerCase() === req.params.id.toLowerCase());
      if (!record) {
        return res.status(404).json({ error: `Record ${req.params.id} not found for investigation.` });
      }

      // Transition issueStatus to INVESTIGATING
      record.issueStatus = 'INVESTIGATING';

      const investigation = await investigateExceptionWithAI({
        record
      });

      // Save investigation on record
      record.investigation = investigation;
      record.issueStatus = investigation.requiresHumanApproval ? 'HUMAN_REVIEW' : 'ACTION_RECOMMENDED';

      // Log AI investigation event to Audit Log
      globalStore.auditLogs.push({
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

      res.json({ investigation, record });
    } catch (err: any) {
      console.error('Investigation error:', err);
      res.status(500).json({ error: err.message || 'AI investigation temporarily unavailable. Deterministic results remain available.' });
    }
  });

  // 8. Policy Check endpoint for action proposal
  app.post('/api/actions/:id', (req, res) => {
    try {
      const record = globalStore.records.find(r => r.id.toLowerCase() === req.params.id.toLowerCase());
      if (!record || !record.investigation) {
        return res.status(404).json({ error: `Record or completed investigation not found for ${req.params.id}.` });
      }

      const { actionType } = req.body;
      const type = actionType || record.investigation.recommendedAction.type;
      const policyResult = evaluateFinancialPolicy(
        record,
        type,
        record.investigation.financialImpact.affectedAmount,
        record.investigation.confidence,
        record.investigation.financialImpact.lossExposure
      );

      res.json({ policyResult });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Execute & Verify Action endpoint (handles Approve / Execute)
  app.post('/api/actions/:id/verify', (req, res) => {
    try {
      const record = globalStore.records.find(r => r.id.toLowerCase() === req.params.id.toLowerCase());
      if (!record) {
        return res.status(404).json({ error: `Record ${req.params.id} not found.` });
      }

      const { actionType, isHumanApproved = false } = req.body;
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
      const result = verifyAndCommitAction(globalStore, record, investigation, actionType || investigation.recommendedAction.type, operator);

      res.json({
        success: result.isVerified,
        record,
        verification: result
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9b. Human Decision endpoint (Approve / Reject / Escalate)
  app.post('/api/actions/:id/decision', (req, res) => {
    try {
      const record = globalStore.records.find(r => r.id.toLowerCase() === req.params.id.toLowerCase());
      if (!record) {
        return res.status(404).json({ error: `Record ${req.params.id} not found.` });
      }

      const { decision, reason } = req.body; // 'APPROVE' | 'REJECT' | 'ESCALATE'
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

        const result = verifyAndCommitAction(globalStore, record, investigation, investigation.recommendedAction.type, 'Human Finance Ops');
        return res.json({
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
        globalStore.auditLogs.push(auditEntry);
        return res.json({ success: true, decision: 'REJECTED', record, auditEntry });
      }

      if (decision === 'ESCALATE') {
        record.status = 'HUMAN_REVIEW';
        record.issueStatus = 'HUMAN_REVIEW';
        if (record.incidentId) {
          const inc = globalStore.incidents.find(i => i.id === record.incidentId);
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
        globalStore.auditLogs.push(auditEntry);
        return res.json({ success: true, decision: 'ESCALATED', record, auditEntry });
      }

      res.status(400).json({ error: `Invalid decision '${decision}'. Expected APPROVE, REJECT, or ESCALATE.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9c. Structured issues list
  app.get('/api/issues', (req, res) => {
    try {
      const { status } = req.query;
      const issues = globalStore.records
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

      res.json({ issues: filtered, total: filtered.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10. Audit Trail endpoint
  app.get('/api/audit', (req, res) => {
    try {
      const { entityId, status, page = '1', limit = '30' } = req.query;
      let logs = [...globalStore.auditLogs].reverse();

      if (entityId && typeof entityId === 'string') {
        const q = entityId.trim().toLowerCase();
        logs = logs.filter(l => l.entityId.toLowerCase().includes(q) || l.id.toLowerCase().includes(q));
      }

      if (status && status !== 'ALL') {
        logs = logs.filter(l => l.status === status);
      }

      const p = Math.max(1, parseInt(page as string, 10) || 1);
      const l = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 30));
      const total = logs.length;
      const startIndex = (p - 1) * l;
      const paginated = logs.slice(startIndex, startIndex + l);

      res.json({
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
        logs: paginated
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 11. Evaluation metrics endpoint
  app.get('/api/evaluation', (req, res) => {
    try {
      const evalMetrics = globalStore.getEvaluationMetrics();
      res.json(evalMetrics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 12. Reset Data endpoint
  app.post('/api/reset-data', (req, res) => {
    try {
      globalStore.reset();
      res.json({ success: true, message: 'Dataset reseeded to 500 records with standard ground truth anomalies.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 13. Razorpay Test Mode integration & simulator
  app.get('/api/razorpay/status', (req, res) => {
    const hasKey = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_xxxx');
    res.json({
      mode: hasKey ? 'RAZORPAY_LIVE_TEST_API' : 'SYNTHETIC_BENCHMARK_DEMO',
      keyIdConfigured: hasKey ? `${process.env.RAZORPAY_KEY_ID?.slice(0, 8)}...` : null,
      activeDataset: '500 Records Ground Truth Benchmark (Seed: 42)',
      geminiAiConfigured: Boolean(process.env.GEMINI_API_KEY)
    });
  });

  // 14. Simulate live incoming payment/webhook or anomaly
  app.post(['/api/razorpay/simulate', '/api/simulate-issue'], (req, res) => {
    try {
      const { anomalyType = 'DUPLICATE_PAYMENT', amount } = req.body;
      const numAmount = amount ? Number(amount) : undefined;
      const result = globalStore.simulateAnomaly(anomalyType, numAmount);
      res.json({
        success: true,
        record: result.record,
        incident: result.incident,
        anomalyType: result.anomalyType
      });
    } catch (err: any) {
      console.error('Simulation error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Catch-all 404 handler for API routes to guarantee JSON response and prevent HTML falling through
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: `API route not found: ${req.method} ${req.path}`,
      status: 404
    });
  });

  // Global Error Handler for API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[Express Error] on ${req.method} ${req.path}:`, err);
    if (req.path.startsWith('/api/')) {
      return res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        status: err.status || 500
      });
    }
    next(err);
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Razorpay Financial Control Tower server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
