const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Shared include ────────────────────────────────────────────────────────────

const INCLUDE = {
  contact: { select: { id: true, name: true, company: true } },
  opportunity: { select: { id: true, title: true, stage: true } },
};

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Returns a paginated list of activities for the given user.
 * Optionally filters by type, contactId or opportunityId.
 *
 * @param {number} userId
 * @param {{ type?: string, contactId?: number, opportunityId?: number, page?: number, limit?: number }} filters
 */
async function list(userId, filters = {}) {
  const { type, contactId, opportunityId, page = 1, limit = 30 } = filters;

  const where = { userId };
  if (type)           where.type          = type;
  if (contactId)      where.contactId     = contactId;
  if (opportunityId)  where.opportunityId = opportunityId;

  const [data, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: INCLUDE,
      orderBy: { activityDate: 'desc' },
      skip:  (page - 1) * limit,
      take:  limit,
    }),
    prisma.activity.count({ where }),
  ]);

  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Returns a single activity belonging to the user, or null.
 *
 * @param {number} userId
 * @param {number} id
 */
async function findById(userId, id) {
  return prisma.activity.findFirst({ where: { id, userId }, include: INCLUDE });
}

/**
 * Creates a new activity.
 *
 * @param {number} userId
 * @param {{ contactId: number, type: string, description: string, activityDate: string, opportunityId?: number }} dto
 */
async function create(userId, dto) {
  return prisma.activity.create({
    data: { ...dto, userId },
    include: INCLUDE,
  });
}

/**
 * Updates an existing activity. Returns null if not found / not owned.
 *
 * @param {number} userId
 * @param {number} id
 * @param {Partial<typeof dto>} dto
 */
async function update(userId, id, dto) {
  const existing = await prisma.activity.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return prisma.activity.update({ where: { id }, data: dto, include: INCLUDE });
}

/**
 * Deletes an activity. Returns null if not found / not owned.
 *
 * @param {number} userId
 * @param {number} id
 */
async function remove(userId, id) {
  const existing = await prisma.activity.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return prisma.activity.delete({ where: { id } });
}

module.exports = { list, findById, create, update, remove };
