const express = require('express');
const cors = require('cors');
const { port, corsOrigins } = require('./config');
const authRoutes = require('./modules/auth/auth.routes');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();

// ── Middlewares ───────────────────────────────────────────────────────────────
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', version: '1.0.0', docs: '/api/auth' }));
app.use('/api/auth', authRoutes);

// ── Error handler (must be last) ──────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(port, () => console.log(`🚀  MAO CRM API → http://localhost:${port}`));
}

module.exports = app; // exported for testing
