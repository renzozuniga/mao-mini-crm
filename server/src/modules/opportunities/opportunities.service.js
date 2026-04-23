const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Returns all opportunities for a user ordered by value desc.
 * Includes the associated contact (id, name, company).
 *
 * @param {number} userId
 */
async function list(userId) {
  return prisma.opportunity.findMany({
    where:   { userId },
    orderBy: { value: 'desc' },
    include: {
      contact: { select: { id: true, name: true, company: true } },
    },
  });
}

/**
 * Returns a single opportunity by id, verifying ownership.
 *
 * @param {number} userId
 * @param {number} id
 */
async function findById(userId, id) {
  return prisma.opportunity.findFirst({
    where:   { id, userId },
    include: { contact: { select: { id: true, name: true, company: true } } },
  });
}

/**
 * Creates a new opportunity.
 *
 * @param {number} userId
 * @param {{ contactId, title, value, stage, probability, expectedCloseDate? }} data
 */
async function create(userId, data) {
  const clean = {
    ...data,
    expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
  };
  return prisma.opportunity.create({
    data:    { ...clean, userId },
    include: { contact: { select: { id: true, name: true, company: true } } },
  });
}

/**
 * Updates an opportunity. Verifies ownership first.
 *
 * @param {number} userId
 * @param {number} id
 * @param {object} data
 */
async function update(userId, id, data) {
  const existing = await prisma.opportunity.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const clean = { ...data };
  if ('expectedCloseDate' in clean) {
    clean.expectedCloseDate = clean.expectedCloseDate ? new Date(clean.expectedCloseDate) : null;
  }

  return prisma.opportunity.update({
    where:   { id },
    data:    clean,
    include: { contact: { select: { id: true, name: true, company: true } } },
  });
}

/**
 * Deletes an opportunity and nullifies its reference in related activities.
 *
 * @param {number} userId
 * @param {number} id
 */
async function remove(userId, id) {
  const existing = await prisma.opportunity.findFirst({ where: { id, userId } });
  if (!existing) return null;

  await prisma.activity.updateMany({
    where: { opportunityId: id },
    data:  { opportunityId: null },
  });

  return prisma.opportunity.delete({ where: { id } });
}

module.exports = { list, findById, create, update, remove };
