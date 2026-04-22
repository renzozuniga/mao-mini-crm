/**
 * Seed script — populates the database with rich demo data for portfolio showcase.
 * 25 contacts, 30 opportunities across all stages, 20 activities.
 *
 * Usage:  node src/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────────────────────

const daysAgo   = (d) => new Date(Date.now() - d * 86_400_000);
const daysAhead = (d) => new Date(Date.now() + d * 86_400_000);

// ── Contacts (25) ─────────────────────────────────────────────────────────────

const CONTACTS = [
  // ACTIVE (12)
  { name: 'Alejandro Torres',  email: 'a.torres@fintech.pe',     phone: '+51 987 111 001', company: 'Fintech Perú',        status: 'ACTIVE' },
  { name: 'Valentina Ríos',    email: 'v.rios@constructora.cl',  phone: '+56 912 222 002', company: 'Constructora Andina', status: 'ACTIVE' },
  { name: 'Diego Morales',     email: 'd.morales@logistica.mx',  phone: '+52 554 333 003', company: 'LogiRed México',      status: 'ACTIVE' },
  { name: 'Camila Herrera',    email: 'c.herrera@retail.co',     phone: '+57 310 444 004', company: 'Retail Colombia',     status: 'ACTIVE' },
  { name: 'Rodrigo Vega',      email: 'r.vega@agro.ar',          phone: '+54 911 555 005', company: 'AgroSur Argentina',   status: 'ACTIVE' },
  { name: 'Sofía Mendoza',     email: 's.mendoza@salud.pe',      phone: '+51 955 666 006', company: 'Clínica Bienestar',   status: 'ACTIVE' },
  { name: 'Matías Fuentes',    email: 'm.fuentes@edu.cl',        phone: '+56 934 777 007', company: 'EduTech Chile',       status: 'ACTIVE' },
  { name: 'Lucía Paredes',     email: 'l.paredes@inmobil.pe',    phone: '+51 912 888 008', company: 'Inmobil Inversiones', status: 'ACTIVE' },
  { name: 'Natalia Vargas',    email: 'n.vargas@ecommerce.co',   phone: '+57 320 777 016', company: 'eCommerce Latam',     status: 'ACTIVE' },
  { name: 'Felipe Romero',     email: 'f.romero@mineria.cl',     phone: '+56 978 888 017', company: 'Minería del Sur',     status: 'ACTIVE' },
  { name: 'Catalina Flores',   email: 'c.flores@marketing.pe',   phone: '+51 956 999 018', company: 'Marketing 360',       status: 'ACTIVE' },
  { name: 'Carlos Espinoza',   email: 'c.espinoza@auto.cl',      phone: '+56 967 444 023', company: 'AutoGroup Chile',     status: 'ACTIVE' },
  // LEAD (9)
  { name: 'Sebastián Castro',  email: 's.castro@seguros.mx',     phone: '+52 555 999 009', company: 'Seguros del Norte',   status: 'LEAD'   },
  { name: 'Fernanda Rojas',    email: 'f.rojas@turismo.cl',      phone: '+56 922 111 010', company: 'Turismo Austral',     status: 'LEAD'   },
  { name: 'Andrés Navarro',    email: 'a.navarro@industrial.co', phone: '+57 315 222 011', company: 'Industrial Caribe',   status: 'LEAD'   },
  { name: 'Isabella Guerrero', email: 'i.guerrero@media.ar',     phone: '+54 915 333 012', company: 'Media Group Sur',     status: 'LEAD'   },
  { name: 'Tomás Jiménez',     email: 't.jimenez@tech.pe',       phone: '+51 934 444 013', company: 'TechSolutions Perú',  status: 'LEAD'   },
  { name: 'Mariana López',     email: 'm.lopez@alimentos.mx',    phone: '+52 556 555 014', company: 'Alimentos del Valle', status: 'LEAD'   },
  { name: 'Pablo Reyes',       email: 'p.reyes@consultora.cl',   phone: '+56 945 666 015', company: 'Consultora Reyes',    status: 'LEAD'   },
  { name: 'Ricardo Peña',      email: 'r.pena@startup.pe',       phone: '+51 988 222 021', company: 'Startup Hub Lima',    status: 'LEAD'   },
  { name: 'Gabriela Ortiz',    email: 'g.ortiz@diseno.co',       phone: '+57 313 333 022', company: 'Diseño Creativo',     status: 'LEAD'   },
  // INACTIVE (4)
  { name: 'Jorge Mendez',      email: 'j.mendez@energia.mx',     phone: '+52 554 000 019', company: 'Energía Renovable',   status: 'INACTIVE' },
  { name: 'Daniela Soto',      email: 'd.soto@banca.ar',         phone: '+54 911 111 020', company: 'Banco Sur',           status: 'INACTIVE' },
  { name: 'Valeria Guzmán',    email: 'v.guzman@pharma.mx',      phone: '+52 553 555 024', company: 'Pharma Latinoamérica',status: 'INACTIVE' },
  { name: 'Nicolás Ibáñez',    email: 'n.ibanez@software.ar',    phone: '+54 915 666 025', company: 'Software Factory BA', status: 'ACTIVE' },
];

/** Builds opportunities array once contact IDs are known. */
function buildOpportunities(cids) {
  return [
    // ── LEAD (8) — funnel top, smaller values ──────────────────────────────
    { contactId: cids[12], title: 'Plataforma de seguros digital',      value: 8500,  stage: 'LEAD',        probability: 10, expectedCloseDate: daysAhead(60) },
    { contactId: cids[13], title: 'Sistema de reservas online',          value: 12000, stage: 'LEAD',        probability: 15, expectedCloseDate: daysAhead(75) },
    { contactId: cids[14], title: 'ERP para manufactura',                value: 22000, stage: 'LEAD',        probability: 10, expectedCloseDate: daysAhead(90) },
    { contactId: cids[15], title: 'App de gestión de medios',            value: 9500,  stage: 'LEAD',        probability: 20, expectedCloseDate: daysAhead(45) },
    { contactId: cids[16], title: 'Software de facturación electrónica', value: 7800,  stage: 'LEAD',        probability: 15, expectedCloseDate: daysAhead(55) },
    { contactId: cids[17], title: 'Plataforma B2B alimentos',            value: 15500, stage: 'LEAD',        probability: 10, expectedCloseDate: daysAhead(80) },
    { contactId: cids[18], title: 'Portal de consultoras',               value: 6200,  stage: 'LEAD',        probability: 20, expectedCloseDate: daysAhead(50) },
    { contactId: cids[19], title: 'MVP para startup fintech',            value: 11000, stage: 'LEAD',        probability: 15, expectedCloseDate: daysAhead(70) },
    // ── QUALIFIED (6) ─────────────────────────────────────────────────────
    { contactId: cids[0],  title: 'App móvil de pagos',                  value: 28000, stage: 'QUALIFIED',   probability: 30, expectedCloseDate: daysAhead(40) },
    { contactId: cids[3],  title: 'Sistema de inventario retail',        value: 19500, stage: 'QUALIFIED',   probability: 35, expectedCloseDate: daysAhead(35) },
    { contactId: cids[6],  title: 'Plataforma LMS educativa',            value: 32000, stage: 'QUALIFIED',   probability: 40, expectedCloseDate: daysAhead(50) },
    { contactId: cids[8],  title: 'Tienda ecommerce con POS',            value: 24500, stage: 'QUALIFIED',   probability: 35, expectedCloseDate: daysAhead(45) },
    { contactId: cids[20], title: 'Suite de diseño colaborativo',        value: 18000, stage: 'QUALIFIED',   probability: 30, expectedCloseDate: daysAhead(60) },
    { contactId: cids[24], title: 'CRM para agencia de software',        value: 21000, stage: 'QUALIFIED',   probability: 40, expectedCloseDate: daysAhead(30) },
    // ── PROPOSAL (4) ──────────────────────────────────────────────────────
    { contactId: cids[1],  title: 'Portal de proyectos constructora',    value: 35000, stage: 'PROPOSAL',    probability: 55, expectedCloseDate: daysAhead(25) },
    { contactId: cids[4],  title: 'Sistema de trazabilidad agrícola',    value: 27500, stage: 'PROPOSAL',    probability: 60, expectedCloseDate: daysAhead(20) },
    { contactId: cids[7],  title: 'Módulo de gestión inmobiliaria',      value: 41000, stage: 'PROPOSAL',    probability: 50, expectedCloseDate: daysAhead(30) },
    { contactId: cids[10], title: 'Dashboard de campañas marketing',     value: 22000, stage: 'PROPOSAL',    probability: 55, expectedCloseDate: daysAhead(15) },
    // ── NEGOTIATION (3) ───────────────────────────────────────────────────
    { contactId: cids[2],  title: 'Plataforma de logística last-mile',   value: 48000, stage: 'NEGOTIATION', probability: 75, expectedCloseDate: daysAhead(10) },
    { contactId: cids[5],  title: 'Historia clínica electrónica',        value: 39000, stage: 'NEGOTIATION', probability: 80, expectedCloseDate: daysAhead(8)  },
    { contactId: cids[23], title: 'Portal de farmacovigilancia',         value: 31500, stage: 'NEGOTIATION', probability: 70, expectedCloseDate: daysAhead(12) },
    // ── CLOSED_WON (5) ────────────────────────────────────────────────────
    { contactId: cids[9],  title: 'Sistema de nómina minería',           value: 52000, stage: 'CLOSED_WON',  probability: 100, expectedCloseDate: daysAgo(5)  },
    { contactId: cids[11], title: 'App de gestión vehicular',            value: 29000, stage: 'CLOSED_WON',  probability: 100, expectedCloseDate: daysAgo(12) },
    { contactId: cids[0],  title: 'Dashboard financiero ejecutivo',      value: 18500, stage: 'CLOSED_WON',  probability: 100, expectedCloseDate: daysAgo(20) },
    { contactId: cids[4],  title: 'Portal de proveedores',               value: 23500, stage: 'CLOSED_WON',  probability: 100, expectedCloseDate: daysAgo(30) },
    { contactId: cids[3],  title: 'App de fidelización de clientes',     value: 16000, stage: 'CLOSED_WON',  probability: 100, expectedCloseDate: daysAgo(45) },
    // ── CLOSED_LOST (4) ───────────────────────────────────────────────────
    { contactId: cids[21], title: 'Plataforma de energías renovables',   value: 34000, stage: 'CLOSED_LOST', probability: 0, expectedCloseDate: daysAgo(15) },
    { contactId: cids[22], title: 'App de banca digital',                value: 27000, stage: 'CLOSED_LOST', probability: 0, expectedCloseDate: daysAgo(22) },
    { contactId: cids[12], title: 'Sistema de pólizas en línea',         value: 14500, stage: 'CLOSED_LOST', probability: 0, expectedCloseDate: daysAgo(35) },
    { contactId: cids[15], title: 'Red social corporativa',              value: 19000, stage: 'CLOSED_LOST', probability: 0, expectedCloseDate: daysAgo(50) },
  ];
}

/** Builds activities array once contact + opportunity IDs are known. */
function buildActivities(cids, oids) {
  return [
    // This week (days 0-2)
    { contactId: cids[2],  opportunityId: oids[18], type: 'CALL',    description: 'Revisión final de condiciones del contrato logístico.',       activityDate: daysAgo(0) },
    { contactId: cids[5],  opportunityId: oids[19], type: 'MEETING', description: 'Demo del módulo de historia clínica con el equipo médico.',   activityDate: daysAgo(1) },
    { contactId: cids[1],  opportunityId: oids[14], type: 'EMAIL',   description: 'Envío de propuesta técnica actualizada con nuevas secciones.', activityDate: daysAgo(1) },
    { contactId: cids[23], opportunityId: oids[20], type: 'CALL',    description: 'Llamada de negociación — descuento acordado del 8%.',          activityDate: daysAgo(2) },
    { contactId: cids[4],  opportunityId: oids[15], type: 'MEETING', description: 'Presentación de la arquitectura de trazabilidad al CTO.',      activityDate: daysAgo(2) },
    // Last week (days 5-9)
    { contactId: cids[0],  opportunityId: oids[8],  type: 'EMAIL',   description: 'Propuesta de integración con Yape y Plin enviada.',            activityDate: daysAgo(5) },
    { contactId: cids[9],  opportunityId: oids[21], type: 'MEETING', description: 'Kickoff de proyecto — firma de contrato nómina minería.',      activityDate: daysAgo(5) },
    { contactId: cids[7],  opportunityId: oids[16], type: 'CALL',    description: 'Aclaración de requerimientos del módulo de arrendamientos.',   activityDate: daysAgo(6) },
    { contactId: cids[3],  opportunityId: oids[9],  type: 'NOTE',    description: 'Cliente interesado en integración con SAP. Pendiente cotizar.', activityDate: daysAgo(7) },
    { contactId: cids[6],  opportunityId: oids[10], type: 'MEETING', description: 'Workshop de UX con equipo pedagógico de EduTech.',             activityDate: daysAgo(8) },
    { contactId: cids[8],  opportunityId: oids[11], type: 'CALL',    description: 'Revisión de módulo de pagos y carrito de compras.',            activityDate: daysAgo(9) },
    // Two weeks ago (days 10-14)
    { contactId: cids[11], opportunityId: oids[22], type: 'EMAIL',   description: 'Confirmación de recepción de entregable v1.0 - app vehicular.', activityDate: daysAgo(10) },
    { contactId: cids[13], opportunityId: oids[1],  type: 'EMAIL',   description: 'Primer contacto — envío de dossier de servicios.',             activityDate: daysAgo(11) },
    { contactId: cids[10], opportunityId: oids[17], type: 'MEETING', description: 'Revisión de wireframes del dashboard de campañas.',            activityDate: daysAgo(12) },
    { contactId: cids[24], opportunityId: oids[13], type: 'CALL',    description: 'Demo del CRM — muy buena recepción del equipo de ventas.',     activityDate: daysAgo(13) },
    // Older (days 15+)
    { contactId: cids[21], opportunityId: oids[26], type: 'NOTE',    description: 'Deal perdido — cliente decidió desarrollar solución in-house.', activityDate: daysAgo(16) },
    { contactId: cids[16], opportunityId: oids[4],  type: 'CALL',    description: 'Primer acercamiento — interés en facturación electrónica.',    activityDate: daysAgo(18) },
    { contactId: cids[19], opportunityId: oids[7],  type: 'MEETING', description: 'Discovery session para MVP de fintech.',                       activityDate: daysAgo(20) },
    { contactId: cids[4],  opportunityId: oids[24], type: 'EMAIL',   description: 'Cierre formal del proyecto portal de proveedores.',            activityDate: daysAgo(31) },
    { contactId: cids[15], opportunityId: oids[28], type: 'NOTE',    description: 'Perdido por precio — registrar para futura renegociación.',    activityDate: daysAgo(23) },
  ];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱  Seeding database…\n');

  // Users
  const adminHash = await bcrypt.hash('Admin1234!', 10);
  const userHash  = await bcrypt.hash('User1234!',  10);

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@maocrm.dev' },
    update: {},
    create: { email: 'admin@maocrm.dev', passwordHash: adminHash, fullName: 'MAO Admin' },
  });

  await prisma.user.upsert({
    where:  { email: 'user@maocrm.dev' },
    update: {},
    create: { email: 'user@maocrm.dev', passwordHash: userHash, fullName: 'Demo User' },
  });

  // Clean previous admin data to allow re-seeding safely
  await prisma.activity.deleteMany({ where: { userId: admin.id } });
  await prisma.opportunity.deleteMany({ where: { userId: admin.id } });
  await prisma.contact.deleteMany({ where: { userId: admin.id } });

  // Contacts
  const contacts = await Promise.all(
    CONTACTS.map(c => prisma.contact.create({ data: { ...c, userId: admin.id } }))
  );
  const cids = contacts.map(c => c.id);
  console.log(`  ✓ ${contacts.length} contacts`);

  // Opportunities
  const oppsData = buildOpportunities(cids);
  const opps = await Promise.all(
    oppsData.map(o => prisma.opportunity.create({ data: { ...o, userId: admin.id } }))
  );
  const oids = opps.map(o => o.id);
  console.log(`  ✓ ${opps.length} opportunities`);

  // Activities — fix typo helper reference
  const actsData = buildActivities(cids, oids).map(a => ({
    ...a,
    activityDate: a.activityDate instanceof Date ? a.activityDate : new Date(),
  }));
  const acts = await Promise.all(
    actsData.map(a => prisma.activity.create({ data: { ...a, userId: admin.id } }))
  );
  console.log(`  ✓ ${acts.length} activities`);

  // Summary
  const byStage = oppsData.reduce((acc, o) => {
    acc[o.stage] = (acc[o.stage] || 0) + 1;
    return acc;
  }, {});
  console.log('\n  Pipeline distribution:');
  Object.entries(byStage).forEach(([s, n]) => console.log(`    ${s.padEnd(14)} ${n}`));

  console.log('\n✅  Seed complete!');
  console.log('   admin@maocrm.dev  /  Admin1234!');
  console.log('   user@maocrm.dev   /  User1234!');
}

seed()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
