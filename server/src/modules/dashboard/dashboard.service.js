const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const STAGES      = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
const OPEN_STAGES = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'];

/** Start of current week (Monday 00:00:00). */
function startOfWeek() {
  const now  = new Date();
  const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
  const mon  = new Date(now);
  mon.setDate(now.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

/** Formats a Date as "YYYY-MM-DD" (local time). */
function toDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Returns a full dashboard summary for a user.
 * Single Promise.all to minimise DB round-trips.
 *
 * @param {number} userId
 */
async function getSummary(userId) {
  const trend14Start = new Date(Date.now() - 13 * 86_400_000);
  trend14Start.setHours(0, 0, 0, 0);

  const [
    allContacts,
    opportunities,
    activitiesThisWeek,
    recentActivities,
    trendActivities,
    topOpps,
  ] = await Promise.all([

    // All contacts (status for doughnut)
    prisma.contact.findMany({
      where:  { userId },
      select: { status: true },
    }),

    // All opportunities (stage + value for pipeline bar)
    prisma.opportunity.findMany({
      where:  { userId },
      select: { stage: true, value: true },
    }),

    // Activities count this week
    prisma.activity.count({
      where: { userId, activityDate: { gte: startOfWeek() } },
    }),

    // Last 8 activities for the feed
    prisma.activity.findMany({
      where:   { userId },
      orderBy: { activityDate: 'desc' },
      take:    8,
      select: {
        id: true, type: true, description: true, activityDate: true,
        contact: { select: { name: true, company: true } },
      },
    }),

    // Activities in the last 14 days for the trend line
    prisma.activity.findMany({
      where:   { userId, activityDate: { gte: trend14Start } },
      select:  { activityDate: true, type: true },
    }),

    // Top 5 open opportunities by value (for horizontal bar)
    prisma.opportunity.findMany({
      where:   { userId, stage: { in: OPEN_STAGES } },
      orderBy: { value: 'desc' },
      take:    5,
      select: {
        title: true, value: true, stage: true,
        contact: { select: { name: true } },
      },
    }),
  ]);

  // ── Aggregations ────────────────────────────────────────────────────────────

  const openOpps      = opportunities.filter(o => OPEN_STAGES.includes(o.stage));
  const pipelineValue = openOpps.reduce((sum, o) => sum + Number(o.value), 0);

  // Pipeline bar: count + value per stage
  const pipelineByStage = STAGES.map(stage => {
    const group = opportunities.filter(o => o.stage === stage);
    return {
      stage,
      count: group.length,
      value: group.reduce((sum, o) => sum + Number(o.value), 0),
    };
  });

  // Contact doughnut: count per status
  const contactsByStatus = {
    ACTIVE:   allContacts.filter(c => c.status === 'ACTIVE').length,
    LEAD:     allContacts.filter(c => c.status === 'LEAD').length,
    INACTIVE: allContacts.filter(c => c.status === 'INACTIVE').length,
  };

  // Activity trend line: count per day over last 14 days
  const trendMap = {};
  trendActivities.forEach(a => {
    const key = toDateKey(a.activityDate);
    trendMap[key] = (trendMap[key] || 0) + 1;
  });
  const activityTrend = Array.from({ length: 14 }, (_, i) => {
    const d   = new Date(Date.now() - (13 - i) * 86_400_000);
    const key = toDateKey(d);
    return {
      date:  key,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: trendMap[key] || 0,
    };
  });

  return {
    kpis: {
      totalContacts:      allContacts.length,
      openOpportunities:  openOpps.length,
      pipelineValue,
      activitiesThisWeek,
    },
    pipelineByStage,
    contactsByStatus,
    activityTrend,
    topOpportunities: topOpps.map(o => ({
      title:   o.title,
      value:   Number(o.value),
      stage:   o.stage,
      contact: o.contact.name,
    })),
    recentActivities,
  };
}

module.exports = { getSummary };
