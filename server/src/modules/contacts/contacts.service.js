const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Returns a paginated, filtered list of contacts for a user.
 *
 * @param {number} userId
 * @param {{ page?: number, limit?: number, search?: string, status?: string }} opts
 */
async function list(userId, { page = 1, limit = 12, search = '', status = '' } = {}) {
  const where = {
    userId,
    ...(status && { status }),
    ...(search && {
      OR: [
        { name:    { contains: search, mode: 'insensitive' } },
        { email:   { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:  (page - 1) * limit,
      take:  limit,
      select: {
        id: true, name: true, email: true, phone: true,
        company: true, status: true, notes: true, createdAt: true,
        _count: { select: { opportunities: true, activities: true } },
      },
    }),
    prisma.contact.count({ where }),
  ]);

  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Returns a single contact by id, verifying ownership.
 *
 * @param {number} userId
 * @param {number} id
 */
async function findById(userId, id) {
  const contact = await prisma.contact.findFirst({
    where: { id, userId },
    include: {
      _count: { select: { opportunities: true, activities: true } },
    },
  });
  return contact;
}

/**
 * Creates a new contact for the user.
 *
 * @param {number} userId
 * @param {{ name, email?, phone?, company?, status?, notes? }} data
 */
async function create(userId, data) {
  return prisma.contact.create({
    data: { ...data, userId },
  });
}

/**
 * Updates a contact. Only updates fields that are explicitly provided.
 *
 * @param {number} userId
 * @param {number} id
 * @param {object} data
 */
async function update(userId, id, data) {
  const existing = await prisma.contact.findFirst({ where: { id, userId } });
  if (!existing) return null;

  return prisma.contact.update({
    where: { id },
    data,
  });
}

/**
 * Deletes a contact and all related activities/opportunities (cascade in Prisma).
 *
 * @param {number} userId
 * @param {number} id
 */
async function remove(userId, id) {
  const existing = await prisma.contact.findFirst({ where: { id, userId } });
  if (!existing) return null;

  // Delete related records first (Prisma doesn't cascade unless schema has onDelete)
  await prisma.activity.deleteMany({ where: { contactId: id } });
  await prisma.opportunity.deleteMany({ where: { contactId: id } });
  return prisma.contact.delete({ where: { id } });
}

module.exports = { list, findById, create, update, remove };
