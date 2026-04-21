/**
 * Seed script — populates the database with demo users, contacts,
 * opportunities and activities.
 *
 * Usage:  node src/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seed() {
  // ── Users ──────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin1234!', 10);
  const userHash  = await bcrypt.hash('User1234!', 10);

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@maocrm.dev' },
    update: {},
    create: { email: 'admin@maocrm.dev', passwordHash: adminHash, fullName: 'MAO Admin' },
  });

  const demo = await prisma.user.upsert({
    where:  { email: 'user@maocrm.dev' },
    update: {},
    create: { email: 'user@maocrm.dev', passwordHash: userHash, fullName: 'Demo User' },
  });

  // ── Contacts ───────────────────────────────────────────────────────────────
  const contacts = await Promise.all([
    prisma.contact.upsert({
      where:  { id: 1 },
      update: {},
      create: { userId: admin.id, name: 'Carlos Méndez',  email: 'carlos@techinc.pe',   phone: '+51 987 654 321', company: 'Tech Inc.',       status: 'ACTIVE' },
    }),
    prisma.contact.upsert({
      where:  { id: 2 },
      update: {},
      create: { userId: admin.id, name: 'Sofía Ramírez',  email: 'sofia@retailpro.com', phone: '+51 976 543 210', company: 'Retail Pro',       status: 'ACTIVE' },
    }),
    prisma.contact.upsert({
      where:  { id: 3 },
      update: {},
      create: { userId: admin.id, name: 'Andrés Torres',  email: 'andres@logix.pe',     phone: '+51 965 432 109', company: 'Logix Perú',       status: 'LEAD'   },
    }),
    prisma.contact.upsert({
      where:  { id: 4 },
      update: {},
      create: { userId: admin.id, name: 'Valeria Quispe', email: 'val@fintech.io',       phone: '+51 954 321 098', company: 'FinTech Solutions', status: 'LEAD'   },
    }),
    prisma.contact.upsert({
      where:  { id: 5 },
      update: {},
      create: { userId: admin.id, name: 'Miguel Castro',  email: 'miguel@buildco.pe',    phone: '+51 943 210 987', company: 'BuildCo',          status: 'INACTIVE' },
    }),
  ]);

  // ── Opportunities ──────────────────────────────────────────────────────────
  const opps = await Promise.all([
    prisma.opportunity.upsert({
      where:  { id: 1 },
      update: {},
      create: {
        userId: admin.id, contactId: contacts[0].id,
        title: 'Sistema ERP modular', value: 35000,
        stage: 'PROPOSAL', probability: 65,
        expectedCloseDate: new Date('2025-08-30'),
      },
    }),
    prisma.opportunity.upsert({
      where:  { id: 2 },
      update: {},
      create: {
        userId: admin.id, contactId: contacts[1].id,
        title: 'Rediseño plataforma e-commerce', value: 18500,
        stage: 'NEGOTIATION', probability: 80,
        expectedCloseDate: new Date('2025-07-15'),
      },
    }),
    prisma.opportunity.upsert({
      where:  { id: 3 },
      update: {},
      create: {
        userId: admin.id, contactId: contacts[2].id,
        title: 'App de tracking de flotas', value: 22000,
        stage: 'QUALIFIED', probability: 40,
        expectedCloseDate: new Date('2025-09-01'),
      },
    }),
    prisma.opportunity.upsert({
      where:  { id: 4 },
      update: {},
      create: {
        userId: admin.id, contactId: contacts[3].id,
        title: 'Dashboard analytics financiero', value: 12000,
        stage: 'LEAD', probability: 20,
        expectedCloseDate: new Date('2025-10-01'),
      },
    }),
    prisma.opportunity.upsert({
      where:  { id: 5 },
      update: {},
      create: {
        userId: admin.id, contactId: contacts[0].id,
        title: 'Integración API de pagos', value: 8500,
        stage: 'CLOSED_WON', probability: 100,
        expectedCloseDate: new Date('2025-06-01'),
      },
    }),
  ]);

  // ── Activities ─────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.activity.upsert({
      where:  { id: 1 },
      update: {},
      create: {
        userId: admin.id, contactId: contacts[0].id, opportunityId: opps[0].id,
        type: 'MEETING', description: 'Reunión de presentación de propuesta técnica',
        activityDate: new Date('2025-06-10T10:00:00'),
      },
    }),
    prisma.activity.upsert({
      where:  { id: 2 },
      update: {},
      create: {
        userId: admin.id, contactId: contacts[1].id, opportunityId: opps[1].id,
        type: 'CALL', description: 'Llamada para definir alcance del rediseño',
        activityDate: new Date('2025-06-12T14:30:00'),
      },
    }),
    prisma.activity.upsert({
      where:  { id: 3 },
      update: {},
      create: {
        userId: admin.id, contactId: contacts[2].id,
        type: 'EMAIL', description: 'Envío de brochure de servicios y casos de éxito',
        activityDate: new Date('2025-06-14T09:00:00'),
      },
    }),
    prisma.activity.upsert({
      where:  { id: 4 },
      update: {},
      create: {
        userId: admin.id, contactId: contacts[0].id,
        type: 'NOTE', description: 'Cliente interesado en módulo de RRHH adicional',
        activityDate: new Date('2025-06-15T11:00:00'),
      },
    }),
  ]);

  console.log('✅  Seed complete!');
  console.log('   Admin:    admin@maocrm.dev  /  Admin1234!');
  console.log('   Usuario:  user@maocrm.dev   /  User1234!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
