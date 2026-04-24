const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns a Date object N days before now (start of that day, UTC).
 * @param {number} days
 */
function daysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Formats a Date to a "YYYY-MM" month key.
 * @param {Date} d
 */
function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Formats a Date to a "YYYY-MM-DD" day key.
 * @param {Date} d
 */
function dayKey(d) {
  return d.toISOString().slice(0, 10);
}

// ── Report functions ──────────────────────────────────────────────────────────

/**
 * Revenue by pipeline stage — weighted (value × probability) and total per stage.
 * @param {number} userId
 */
async function pipelineRevenue(userId) {
  const opps = await prisma.opportunity.findMany({
    where:  { userId },
    select: { stage: true, value: true, probability: true },
  });

  const stages = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
  const result = Object.fromEntries(stages.map(s => [s, { total: 0, weighted: 0, count: 0 }]));

  for (const o of opps) {
    const v = Number(o.value);
    result[o.stage].total    += v;
    result[o.stage].weighted += v * (o.probability / 100);
    result[o.stage].count    += 1;
  }

  return stages.map(s => ({ stage: s, ...result[s] }));
}

/**
 * Activities per day broken down by type, for the last N days.
 * @param {number} userId
 * @param {number} days
 */
async function activitiesOverTime(userId, days = 30) {
  const since = daysAgo(days);
  const acts  = await prisma.activity.findMany({
    where:  { userId, activityDate: { gte: since } },
    select: { type: true, activityDate: true },
  });

  // Build a map of day → { CALL, EMAIL, MEETING, NOTE }
  const map = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    map.set(dayKey(d), { date: dayKey(d), CALL: 0, EMAIL: 0, MEETING: 0, NOTE: 0 });
  }

  for (const a of acts) {
    const k = dayKey(new Date(a.activityDate));
    if (map.has(k)) map.get(k)[a.type] += 1;
  }

  return Array.from(map.values());
}

/**
 * Win/Loss conversion funnel — counts per stage.
 * @param {number} userId
 */
async function conversionFunnel(userId) {
  const stages = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
  const counts = await prisma.opportunity.groupBy({
    by:    ['stage'],
    where: { userId },
    _count: { id: true },
    _sum:   { value: true },
  });

  const map = Object.fromEntries(counts.map(c => [
    c.stage, { count: c._count.id, value: Number(c._sum.value ?? 0) },
  ]));

  const total = stages.slice(0, 4).reduce((s, st) => s + (map[st]?.count ?? 0), 0)
              + (map.CLOSED_WON?.count ?? 0) + (map.CLOSED_LOST?.count ?? 0);

  return stages.map(s => ({
    stage:   s,
    count:   map[s]?.count  ?? 0,
    value:   map[s]?.value  ?? 0,
    pct:     total ? Math.round(((map[s]?.count ?? 0) / total) * 100) : 0,
  }));
}

/**
 * New contacts per month for the last N months.
 * @param {number} userId
 * @param {number} months
 */
async function contactGrowth(userId, months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - months + 1);
  since.setDate(1); since.setHours(0, 0, 0, 0);

  const contacts = await prisma.contact.findMany({
    where:  { userId, createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Seed all months with 0
  const map = new Map();
  for (let i = 0; i < months; i++) {
    const d = new Date(); d.setMonth(d.getMonth() - (months - 1) + i);
    map.set(monthKey(d), { month: monthKey(d), new: 0, cumulative: 0 });
  }
  for (const c of contacts) {
    const k = monthKey(new Date(c.createdAt));
    if (map.has(k)) map.get(k).new += 1;
  }

  // Add cumulative
  let cum = 0;
  for (const entry of map.values()) { cum += entry.new; entry.cumulative = cum; }

  return Array.from(map.values());
}

/**
 * Summary KPIs for the report header.
 * @param {number} userId
 */
async function summary(userId) {
  // Sequential to avoid exhausting Supabase session-mode connection pool
  const totalContacts   = await prisma.contact.count({ where: { userId } });
  const totalOpps       = await prisma.opportunity.count({ where: { userId } });
  const wonOpps         = await prisma.opportunity.aggregate({
    where:  { userId, stage: 'CLOSED_WON' },
    _count: { id: true },
    _sum:   { value: true },
  });
  const lostOpps        = await prisma.opportunity.count({ where: { userId, stage: 'CLOSED_LOST' } });
  const totalActivities = await prisma.activity.count({ where: { userId } });

  const closedTotal = wonOpps._count.id + lostOpps;
  return {
    totalContacts,
    totalOpps,
    totalActivities,
    wonRevenue:  Number(wonOpps._sum.value ?? 0),
    wonDeals:    wonOpps._count.id,
    winRate:     closedTotal ? Math.round((wonOpps._count.id / closedTotal) * 100) : 0,
  };
}

module.exports = { pipelineRevenue, activitiesOverTime, conversionFunnel, contactGrowth, summary };
