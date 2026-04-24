const express = require('express');
const cors = require('cors');
const { port, corsOrigins } = require('./config');
const authRoutes      = require('./modules/auth/auth.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const contactRoutes     = require('./modules/contacts/contacts.routes');
const opportunityRoutes = require('./modules/opportunities/opportunities.routes');
const activityRoutes    = require('./modules/activities/activities.routes');
const reportRoutes      = require('./modules/reports/reports.routes');
const { errorHandler }  = require('./middlewares/error.middleware');

const app = express();

// ── Middlewares ───────────────────────────────────────────────────────────────
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));
app.use('/api/auth',      authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/contacts',      contactRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/activities',   activityRoutes);
app.use('/api/reports',      reportRoutes);

// ── Error handler (must be last) ──────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(port, () => console.log(`🚀  MAO CRM API → http://localhost:${port}`));
}

module.exports = app; // exported for testing
