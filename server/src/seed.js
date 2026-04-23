/**
 * Seed script — populates the database with rich demo data for portfolio showcase.
 * 105 contacts, 40 opportunities across all stages, 30 activities.
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

// ── Contacts (105) ────────────────────────────────────────────────────────────
// Distribution: 55 ACTIVE · 35 LEAD · 15 INACTIVE

const CONTACTS = [
  // ── ACTIVE (55) — idx 0-54 ──────────────────────────────────────────────────
  { name: 'Alejandro Torres',    email: 'a.torres@fintech.pe',        phone: '+51 987 111 001', company: 'Fintech Perú',             status: 'ACTIVE' },
  { name: 'Valentina Ríos',      email: 'v.rios@constructora.cl',     phone: '+56 912 222 002', company: 'Constructora Andina',      status: 'ACTIVE' },
  { name: 'Diego Morales',       email: 'd.morales@logistica.mx',     phone: '+52 554 333 003', company: 'LogiRed México',           status: 'ACTIVE' },
  { name: 'Camila Herrera',      email: 'c.herrera@retail.co',        phone: '+57 310 444 004', company: 'Retail Colombia',          status: 'ACTIVE' },
  { name: 'Rodrigo Vega',        email: 'r.vega@agro.ar',             phone: '+54 911 555 005', company: 'AgroSur Argentina',        status: 'ACTIVE' },
  { name: 'Sofía Mendoza',       email: 's.mendoza@salud.pe',         phone: '+51 955 666 006', company: 'Clínica Bienestar',        status: 'ACTIVE' },
  { name: 'Matías Fuentes',      email: 'm.fuentes@edu.cl',           phone: '+56 934 777 007', company: 'EduTech Chile',            status: 'ACTIVE' },
  { name: 'Lucía Paredes',       email: 'l.paredes@inmobil.pe',       phone: '+51 912 888 008', company: 'Inmobil Inversiones',      status: 'ACTIVE' },
  { name: 'Natalia Vargas',      email: 'n.vargas@ecommerce.co',      phone: '+57 320 777 016', company: 'eCommerce Latam',          status: 'ACTIVE' },
  { name: 'Felipe Romero',       email: 'f.romero@mineria.cl',        phone: '+56 978 888 017', company: 'Minería del Sur',          status: 'ACTIVE' },
  { name: 'Catalina Flores',     email: 'c.flores@marketing.pe',      phone: '+51 956 999 018', company: 'Marketing 360',            status: 'ACTIVE' },
  { name: 'Carlos Espinoza',     email: 'c.espinoza@auto.cl',         phone: '+56 967 444 023', company: 'AutoGroup Chile',          status: 'ACTIVE' },
  { name: 'Nicolás Ibáñez',      email: 'n.ibanez@software.ar',       phone: '+54 915 666 025', company: 'Software Factory BA',      status: 'ACTIVE' },
  { name: 'Andrea Castillo',     email: 'a.castillo@banca.pe',        phone: '+51 944 100 030', company: 'Banca Digital Perú',       status: 'ACTIVE' },
  { name: 'Mauricio Salinas',    email: 'm.salinas@seguros2.cl',      phone: '+56 922 200 031', company: 'Seguros Pacífico',         status: 'ACTIVE' },
  { name: 'Paola Medina',        email: 'p.medina@salud2.mx',         phone: '+52 554 300 032', company: 'Grupo Salud Total',        status: 'ACTIVE' },
  { name: 'Ignacio Ramírez',     email: 'i.ramirez@tech2.co',         phone: '+57 315 400 033', company: 'TechBoost Colombia',       status: 'ACTIVE' },
  { name: 'Florencia Aguilar',   email: 'f.aguilar@retail2.ar',       phone: '+54 911 500 034', company: 'RetailMax Argentina',      status: 'ACTIVE' },
  { name: 'Esteban Gutiérrez',   email: 'e.gutierrez@energia.pe',     phone: '+51 988 600 035', company: 'Energía Solar Perú',       status: 'ACTIVE' },
  { name: 'Ximena Pizarro',      email: 'x.pizarro@logis2.cl',        phone: '+56 945 700 036', company: 'TransCargo Chile',         status: 'ACTIVE' },
  { name: 'Maximiliano Vera',    email: 'm.vera@finance.ar',          phone: '+54 915 800 037', company: 'Finanzas del Plata',       status: 'ACTIVE' },
  { name: 'Daniela Moreno',      email: 'd.moreno@media2.pe',         phone: '+51 966 900 038', company: 'Grupo Media Norte',        status: 'ACTIVE' },
  { name: 'Hernán Contreras',    email: 'h.contreras@alim.cl',        phone: '+56 934 010 039', company: 'Alimentos del Mar',        status: 'ACTIVE' },
  { name: 'Valeria Sepúlveda',   email: 'v.sepulveda@edu2.co',        phone: '+57 320 110 040', company: 'Campus Virtual CO',        status: 'ACTIVE' },
  { name: 'Omar Palacios',       email: 'o.palacios@inmob2.mx',       phone: '+52 556 210 041', company: 'Inmuebles del Centro',     status: 'ACTIVE' },
  { name: 'Renata Vásquez',      email: 'r.vasquez@salud3.pe',        phone: '+51 977 310 042', company: 'Red Salud Lima',           status: 'ACTIVE' },
  { name: 'Cristóbal Lagos',     email: 'c.lagos@manu.cl',            phone: '+56 912 410 043', company: 'Manufactura del Sur',      status: 'ACTIVE' },
  { name: 'Elena Sandoval',      email: 'e.sandoval@turismo2.ar',     phone: '+54 911 510 044', company: 'Turismo Andino',           status: 'ACTIVE' },
  { name: 'Nicolás Castro',      email: 'n.castro@startup2.co',       phone: '+57 313 610 045', company: 'Startup Latam Hub',        status: 'ACTIVE' },
  { name: 'Javiera Molina',      email: 'j.molina@textil.cl',         phone: '+56 945 710 046', company: 'Textil Austral',           status: 'ACTIVE' },
  { name: 'Rubén Acosta',        email: 'r.acosta@agro2.mx',          phone: '+52 554 810 047', company: 'AgroMex Premium',          status: 'ACTIVE' },
  { name: 'Silvana Quispe',      email: 's.quispe@micro.pe',          phone: '+51 933 910 048', company: 'Microfinanzas Andes',      status: 'ACTIVE' },
  { name: 'Bruno Delgado',       email: 'b.delgado@soft2.ar',         phone: '+54 915 011 049', company: 'BDev Studios',             status: 'ACTIVE' },
  { name: 'Patricia Núñez',      email: 'p.nunez@consul2.cl',         phone: '+56 967 111 050', company: 'Nexus Consulting',         status: 'ACTIVE' },
  { name: 'Arturo Cárdenas',     email: 'a.cardenas@pharma2.co',      phone: '+57 310 211 051', company: 'BioPharma Colombia',       status: 'ACTIVE' },
  { name: 'Lorena Fuenzalida',   email: 'l.fuenzalida@retail3.cl',    phone: '+56 922 311 052', company: 'SuperRetail Chile',        status: 'ACTIVE' },
  { name: 'Javier Montoya',      email: 'j.montoya@mineria2.pe',      phone: '+51 955 411 053', company: 'Minera Inca Gold',         status: 'ACTIVE' },
  { name: 'Bárbara Naranjo',     email: 'b.naranjo@mkt2.mx',          phone: '+52 554 511 054', company: 'Agencia Digital MX',       status: 'ACTIVE' },
  { name: 'Eduardo Cabrera',     email: 'e.cabrera@tech3.ar',         phone: '+54 911 611 055', company: 'Arkana Tech BA',           status: 'ACTIVE' },
  { name: 'Tamara Bustos',       email: 't.bustos@salud4.cl',         phone: '+56 934 711 056', company: 'Salud Integral Sur',       status: 'ACTIVE' },
  { name: 'Gonzalo Peralta',     email: 'g.peralta@logis3.co',        phone: '+57 315 811 057', company: 'Cargo Express CO',         status: 'ACTIVE' },
  { name: 'Mónica Araya',        email: 'm.araya@edu3.pe',            phone: '+51 988 911 058', company: 'Instituto Digital Perú',   status: 'ACTIVE' },
  { name: 'César Villanueva',    email: 'c.villanueva@auto2.mx',      phone: '+52 556 012 059', company: 'AutoNorte México',         status: 'ACTIVE' },
  { name: 'Alejandra Ríos',      email: 'a.rios@banca2.ar',           phone: '+54 915 112 060', company: 'Banco Río Digital',        status: 'ACTIVE' },
  { name: 'Roberto Herrera',     email: 'r.herrera@soft3.cl',         phone: '+56 945 212 061', company: 'SoftAndina Systems',       status: 'ACTIVE' },
  { name: 'Vanessa Ospina',      email: 'v.ospina@ecomm2.co',         phone: '+57 320 312 062', company: 'Click & Buy Colombia',     status: 'ACTIVE' },
  { name: 'Danilo Ponce',        email: 'd.ponce@agro3.pe',           phone: '+51 944 412 063', company: 'AgroPacífico Perú',        status: 'ACTIVE' },
  { name: 'Carolina Jiménez',    email: 'c.jimenez@media3.ar',        phone: '+54 911 512 064', company: 'MediaLab Buenos Aires',    status: 'ACTIVE' },
  { name: 'Luis Arenas',         email: 'l.arenas@inmob3.cl',         phone: '+56 912 612 065', company: 'Propiedades del Norte',    status: 'ACTIVE' },
  { name: 'Pilar Reyes',         email: 'p.reyes@consul3.pe',         phone: '+51 966 712 066', company: 'Consult Pro Lima',         status: 'ACTIVE' },
  { name: 'Marcelo Guzmán',      email: 'm.guzman@manu2.mx',          phone: '+52 554 812 067', company: 'Industrias del Bajío',     status: 'ACTIVE' },
  { name: 'Isabel Torres',       email: 'i.torres@hr.co',             phone: '+57 313 912 068', company: 'HR Digital Colombia',      status: 'ACTIVE' },
  { name: 'Enrique Saavedra',    email: 'e.saavedra@turismo3.cl',     phone: '+56 934 013 069', company: 'Viajes del Pacífico',      status: 'ACTIVE' },
  { name: 'Claudia Bravo',       email: 'c.bravo@energia2.ar',        phone: '+54 915 113 070', company: 'Energía Verde Sur',        status: 'ACTIVE' },
  { name: 'Sergio Pedraza',      email: 's.pedraza@fintech2.pe',      phone: '+51 977 213 071', company: 'PayLite Perú',             status: 'ACTIVE' },

  // ── LEAD (35) — idx 55-89 ───────────────────────────────────────────────────
  { name: 'Sebastián Castro',    email: 's.castro@seguros.mx',        phone: '+52 555 999 009', company: 'Seguros del Norte',        status: 'LEAD'   },
  { name: 'Fernanda Rojas',      email: 'f.rojas@turismo.cl',         phone: '+56 922 111 010', company: 'Turismo Austral',          status: 'LEAD'   },
  { name: 'Andrés Navarro',      email: 'a.navarro@industrial.co',    phone: '+57 315 222 011', company: 'Industrial Caribe',        status: 'LEAD'   },
  { name: 'Isabella Guerrero',   email: 'i.guerrero@media.ar',        phone: '+54 915 333 012', company: 'Media Group Sur',          status: 'LEAD'   },
  { name: 'Tomás Jiménez',       email: 't.jimenez@tech.pe',          phone: '+51 934 444 013', company: 'TechSolutions Perú',       status: 'LEAD'   },
  { name: 'Mariana López',       email: 'm.lopez@alimentos.mx',       phone: '+52 556 555 014', company: 'Alimentos del Valle',      status: 'LEAD'   },
  { name: 'Pablo Reyes',         email: 'p.reyes@consultora.cl',      phone: '+56 945 666 015', company: 'Consultora Reyes',         status: 'LEAD'   },
  { name: 'Ricardo Peña',        email: 'r.pena@startup.pe',          phone: '+51 988 222 021', company: 'Startup Hub Lima',         status: 'LEAD'   },
  { name: 'Gabriela Ortiz',      email: 'g.ortiz@diseno.co',          phone: '+57 313 333 022', company: 'Diseño Creativo',          status: 'LEAD'   },
  { name: 'Álvaro Soto',         email: 'a.soto@saas.cl',             phone: '+56 912 433 080', company: 'CloudSaaS Chile',          status: 'LEAD'   },
  { name: 'Natalia Correa',      email: 'n.correa@iot.co',            phone: '+57 310 533 081', company: 'IoT Solutions CO',         status: 'LEAD'   },
  { name: 'Vicente Madrigal',    email: 'v.madrigal@retail4.mx',      phone: '+52 554 633 082', company: 'Tiendas del Pacífico',     status: 'LEAD'   },
  { name: 'Carla Espejo',        email: 'c.espejo@legal.pe',          phone: '+51 955 733 083', company: 'Bufete Legal Perú',        status: 'LEAD'   },
  { name: 'Héctor Montiel',      email: 'h.montiel@auto3.ar',         phone: '+54 915 833 084', company: 'Concesionaria Sur',        status: 'LEAD'   },
  { name: 'Sofía Arias',         email: 's.arias@eventos.cl',         phone: '+56 945 933 085', company: 'Eventos Corporativos CL',  status: 'LEAD'   },
  { name: 'Emilio Chávez',       email: 'e.chavez@health2.co',        phone: '+57 320 034 086', company: 'HealthTech Bogotá',        status: 'LEAD'   },
  { name: 'Manuela Solano',      email: 'm.solano@fintech3.pe',       phone: '+51 966 134 087', company: 'WalletPay Perú',           status: 'LEAD'   },
  { name: 'Patricio Fuenzalida', email: 'p.fuenzalida@edu4.cl',       phone: '+56 934 234 088', company: 'Plataforma Educa',         status: 'LEAD'   },
  { name: 'Karina Delgado',      email: 'k.delgado@ecomm3.ar',        phone: '+54 915 334 089', company: 'eShop Argentina',          status: 'LEAD'   },
  { name: 'Rodrigo Sánchez',     email: 'r.sanchez@mkt3.mx',          phone: '+52 554 434 090', company: 'Publicidad Digital MX',    status: 'LEAD'   },
  { name: 'Luciana Benítez',     email: 'l.benitez@logis4.co',        phone: '+57 315 534 091', company: 'FleetPro Colombia',        status: 'LEAD'   },
  { name: 'Francisco Leiva',     email: 'f.leiva@inmob4.cl',          phone: '+56 922 634 092', company: 'Casas del Sur',            status: 'LEAD'   },
  { name: 'Amanda Zárate',       email: 'a.zarate@pharma3.pe',        phone: '+51 977 734 093', company: 'FarmaRed Perú',            status: 'LEAD'   },
  { name: 'Sebastián Vera',      email: 's.vera@agro4.ar',            phone: '+54 911 834 094', company: 'Campo Verde SA',           status: 'LEAD'   },
  { name: 'Priscila Robles',     email: 'p.robles@tech4.co',          phone: '+57 313 934 095', company: 'CodeFactory CO',           status: 'LEAD'   },
  { name: 'Diego Barrientos',    email: 'd.barrientos@manu3.cl',      phone: '+56 945 035 096', company: 'Planta Industrial Norte',  status: 'LEAD'   },
  { name: 'Tatiana Guzmán',      email: 't.guzman@media4.mx',         phone: '+52 556 135 097', company: 'Medios Digitales MX',      status: 'LEAD'   },
  { name: 'Mauricio Riveros',    email: 'm.riveros@consul4.pe',       phone: '+51 988 235 098', company: 'Advice Partners',          status: 'LEAD'   },
  { name: 'Alejandra Pinto',     email: 'a.pinto@salud5.ar',          phone: '+54 915 335 099', company: 'Clínica del Lago',         status: 'LEAD'   },
  { name: 'Tomás Espinoza',      email: 't.espinoza@energia3.cl',     phone: '+56 912 435 100', company: 'Paneles Solar Chile',      status: 'LEAD'   },
  { name: 'Valeria Mondragón',   email: 'v.mondragon@fintech4.co',    phone: '+57 320 535 101', company: 'NeoBank Colombia',         status: 'LEAD'   },
  { name: 'Rodrigo Pérez',       email: 'r.perez@turismo4.mx',        phone: '+52 554 635 102', company: 'Viajes Exprés MX',         status: 'LEAD'   },
  { name: 'Cecilia Campos',      email: 'c.campos@hr2.pe',            phone: '+51 955 735 103', company: 'Talento Latam',            status: 'LEAD'   },
  { name: 'Gustavo Morales',     email: 'g.morales@soft4.ar',         phone: '+54 915 835 104', company: 'NeoDev Argentina',         status: 'LEAD'   },
  { name: 'Pamela Figueroa',     email: 'p.figueroa@retail5.cl',      phone: '+56 934 935 105', company: 'Fashion Retail CL',        status: 'LEAD'   },

  // ── INACTIVE (15) — idx 90-104 ──────────────────────────────────────────────
  { name: 'Jorge Mendez',        email: 'j.mendez@energia.mx',        phone: '+52 554 000 019', company: 'Energía Renovable MX',     status: 'INACTIVE' },
  { name: 'Daniela Soto',        email: 'd.soto@banca.ar',            phone: '+54 911 111 020', company: 'Banco Sur Clásico',        status: 'INACTIVE' },
  { name: 'Valeria Guzmán',      email: 'v.guzman@pharma.mx',         phone: '+52 553 555 024', company: 'Pharma Latinoamérica',     status: 'INACTIVE' },
  { name: 'Horacio Muñoz',       email: 'h.munoz@print.cl',           phone: '+56 922 655 106', company: 'Imprenta Muñoz',           status: 'INACTIVE' },
  { name: 'Elena Villaseca',     email: 'e.villaseca@old.pe',         phone: '+51 933 755 107', company: 'Servicios Clásicos',       status: 'INACTIVE' },
  { name: 'Raúl Contreras',      email: 'r.contreras@trad.co',        phone: '+57 310 855 108', company: 'Comercio Tradicional',     status: 'INACTIVE' },
  { name: 'Miriam Salas',        email: 'm.salas@papele.ar',          phone: '+54 915 955 109', company: 'Papelería del Sur',        status: 'INACTIVE' },
  { name: 'Fernando Tapia',      email: 'f.tapia@transp.cl',          phone: '+56 945 056 110', company: 'Transportes Tapia',        status: 'INACTIVE' },
  { name: 'Gloria Ríos',         email: 'g.rios@serv.mx',             phone: '+52 556 156 111', company: 'Servicios Ríos SA',        status: 'INACTIVE' },
  { name: 'Iván Herrera',        email: 'i.herrera@mant.pe',          phone: '+51 966 256 112', company: 'Mantenimiento Total',      status: 'INACTIVE' },
  { name: 'Sandra Paredes',      email: 's.paredes@ferm.co',          phone: '+57 315 356 113', company: 'Ferretería Paredes',       status: 'INACTIVE' },
  { name: 'Antonio Vidal',       email: 'a.vidal@dist.ar',            phone: '+54 911 456 114', company: 'Distribuidora Vidal',      status: 'INACTIVE' },
  { name: 'Teresa Alvarado',     email: 't.alvarado@ofic.cl',         phone: '+56 934 556 115', company: 'Oficinas del Centro',      status: 'INACTIVE' },
  { name: 'Hugo Villalón',       email: 'h.villalon@repues.mx',       phone: '+52 554 656 116', company: 'Repuestos Villalón',       status: 'INACTIVE' },
  { name: 'Martha Quintana',     email: 'm.quintana@serv2.pe',        phone: '+51 977 756 117', company: 'Servicios Quintana',       status: 'INACTIVE' },
];

/** Builds opportunities array once contact IDs are known. */
function buildOpportunities(cids) {
  return [
    // ── LEAD (10) ─────────────────────────────────────────────────────────────
    { contactId: cids[55], title: 'Plataforma de seguros digital',       value:  8500, stage: 'LEAD',        probability: 10, expectedCloseDate: daysAhead(60) },
    { contactId: cids[56], title: 'Sistema de reservas online',           value: 12000, stage: 'LEAD',        probability: 15, expectedCloseDate: daysAhead(75) },
    { contactId: cids[57], title: 'ERP para manufactura',                 value: 22000, stage: 'LEAD',        probability: 10, expectedCloseDate: daysAhead(90) },
    { contactId: cids[58], title: 'App de gestión de medios',             value:  9500, stage: 'LEAD',        probability: 20, expectedCloseDate: daysAhead(45) },
    { contactId: cids[59], title: 'Software de facturación electrónica',  value:  7800, stage: 'LEAD',        probability: 15, expectedCloseDate: daysAhead(55) },
    { contactId: cids[60], title: 'Plataforma B2B alimentos',             value: 15500, stage: 'LEAD',        probability: 10, expectedCloseDate: daysAhead(80) },
    { contactId: cids[61], title: 'Portal de consultoras',                value:  6200, stage: 'LEAD',        probability: 20, expectedCloseDate: daysAhead(50) },
    { contactId: cids[62], title: 'MVP para startup fintech',             value: 11000, stage: 'LEAD',        probability: 15, expectedCloseDate: daysAhead(70) },
    { contactId: cids[64], title: 'Dashboard de métricas B2B',            value: 13500, stage: 'LEAD',        probability: 10, expectedCloseDate: daysAhead(65) },
    { contactId: cids[66], title: 'App de bienestar corporativo',         value:  9800, stage: 'LEAD',        probability: 20, expectedCloseDate: daysAhead(55) },
    // ── QUALIFIED (8) ─────────────────────────────────────────────────────────
    { contactId: cids[0],  title: 'App móvil de pagos',                   value: 28000, stage: 'QUALIFIED',   probability: 30, expectedCloseDate: daysAhead(40) },
    { contactId: cids[3],  title: 'Sistema de inventario retail',         value: 19500, stage: 'QUALIFIED',   probability: 35, expectedCloseDate: daysAhead(35) },
    { contactId: cids[6],  title: 'Plataforma LMS educativa',             value: 32000, stage: 'QUALIFIED',   probability: 40, expectedCloseDate: daysAhead(50) },
    { contactId: cids[8],  title: 'Tienda ecommerce con POS',             value: 24500, stage: 'QUALIFIED',   probability: 35, expectedCloseDate: daysAhead(45) },
    { contactId: cids[20], title: 'Suite de diseño colaborativo',         value: 18000, stage: 'QUALIFIED',   probability: 30, expectedCloseDate: daysAhead(60) },
    { contactId: cids[12], title: 'CRM para agencia de software',         value: 21000, stage: 'QUALIFIED',   probability: 40, expectedCloseDate: daysAhead(30) },
    { contactId: cids[16], title: 'App de telemedicina',                  value: 26000, stage: 'QUALIFIED',   probability: 35, expectedCloseDate: daysAhead(40) },
    { contactId: cids[23], title: 'Portal e-learning corporativo',        value: 17500, stage: 'QUALIFIED',   probability: 30, expectedCloseDate: daysAhead(55) },
    // ── PROPOSAL (6) ──────────────────────────────────────────────────────────
    { contactId: cids[1],  title: 'Portal de proyectos constructora',     value: 35000, stage: 'PROPOSAL',    probability: 55, expectedCloseDate: daysAhead(25) },
    { contactId: cids[4],  title: 'Sistema de trazabilidad agrícola',     value: 27500, stage: 'PROPOSAL',    probability: 60, expectedCloseDate: daysAhead(20) },
    { contactId: cids[7],  title: 'Módulo de gestión inmobiliaria',       value: 41000, stage: 'PROPOSAL',    probability: 50, expectedCloseDate: daysAhead(30) },
    { contactId: cids[10], title: 'Dashboard de campañas marketing',      value: 22000, stage: 'PROPOSAL',    probability: 55, expectedCloseDate: daysAhead(15) },
    { contactId: cids[19], title: 'Sistema de tracking logístico',        value: 31000, stage: 'PROPOSAL',    probability: 60, expectedCloseDate: daysAhead(18) },
    { contactId: cids[30], title: 'Plataforma de microcréditos',          value: 38500, stage: 'PROPOSAL',    probability: 50, expectedCloseDate: daysAhead(22) },
    // ── NEGOTIATION (4) ───────────────────────────────────────────────────────
    { contactId: cids[2],  title: 'Plataforma de logística last-mile',    value: 48000, stage: 'NEGOTIATION', probability: 75, expectedCloseDate: daysAhead(10) },
    { contactId: cids[5],  title: 'Historia clínica electrónica',         value: 39000, stage: 'NEGOTIATION', probability: 80, expectedCloseDate: daysAhead(8)  },
    { contactId: cids[90], title: 'Portal de farmacovigilancia',          value: 31500, stage: 'NEGOTIATION', probability: 70, expectedCloseDate: daysAhead(12) },
    { contactId: cids[37], title: 'ERP minero integrado',                 value: 55000, stage: 'NEGOTIATION', probability: 75, expectedCloseDate: daysAhead(7)  },
    // ── CLOSED_WON (7) ────────────────────────────────────────────────────────
    { contactId: cids[9],  title: 'Sistema de nómina minería',            value: 52000, stage: 'CLOSED_WON',  probability: 100, expectedCloseDate: daysAgo(5)  },
    { contactId: cids[11], title: 'App de gestión vehicular',             value: 29000, stage: 'CLOSED_WON',  probability: 100, expectedCloseDate: daysAgo(12) },
    { contactId: cids[0],  title: 'Dashboard financiero ejecutivo',       value: 18500, stage: 'CLOSED_WON',  probability: 100, expectedCloseDate: daysAgo(20) },
    { contactId: cids[4],  title: 'Portal de proveedores',                value: 23500, stage: 'CLOSED_WON',  probability: 100, expectedCloseDate: daysAgo(30) },
    { contactId: cids[3],  title: 'App de fidelización de clientes',      value: 16000, stage: 'CLOSED_WON',  probability: 100, expectedCloseDate: daysAgo(45) },
    { contactId: cids[13], title: 'Plataforma de banca open API',         value: 44000, stage: 'CLOSED_WON',  probability: 100, expectedCloseDate: daysAgo(8)  },
    { contactId: cids[44], title: 'Sistema de onboarding digital',        value: 27000, stage: 'CLOSED_WON',  probability: 100, expectedCloseDate: daysAgo(18) },
    // ── CLOSED_LOST (5) ───────────────────────────────────────────────────────
    { contactId: cids[91], title: 'Plataforma de energías renovables',    value: 34000, stage: 'CLOSED_LOST', probability: 0, expectedCloseDate: daysAgo(15) },
    { contactId: cids[92], title: 'App de banca digital clásica',         value: 27000, stage: 'CLOSED_LOST', probability: 0, expectedCloseDate: daysAgo(22) },
    { contactId: cids[55], title: 'Sistema de pólizas en línea',          value: 14500, stage: 'CLOSED_LOST', probability: 0, expectedCloseDate: daysAgo(35) },
    { contactId: cids[58], title: 'Red social corporativa',               value: 19000, stage: 'CLOSED_LOST', probability: 0, expectedCloseDate: daysAgo(50) },
    { contactId: cids[93], title: 'Portal de impresión on demand',        value: 11000, stage: 'CLOSED_LOST', probability: 0, expectedCloseDate: daysAgo(40) },
  ];
}

/** Builds activities array once contact + opportunity IDs are known. */
function buildActivities(cids, oids) {
  return [
    // This week
    { contactId: cids[2],  opportunityId: oids[24], type: 'CALL',    description: 'Revisión final de condiciones del contrato logístico.',        activityDate: daysAgo(0) },
    { contactId: cids[5],  opportunityId: oids[25], type: 'MEETING', description: 'Demo del módulo de historia clínica con el equipo médico.',    activityDate: daysAgo(1) },
    { contactId: cids[1],  opportunityId: oids[18], type: 'EMAIL',   description: 'Envío de propuesta técnica actualizada con nuevas secciones.',  activityDate: daysAgo(1) },
    { contactId: cids[90], opportunityId: oids[26], type: 'CALL',    description: 'Llamada de negociación — descuento acordado del 8%.',           activityDate: daysAgo(2) },
    { contactId: cids[4],  opportunityId: oids[19], type: 'MEETING', description: 'Presentación de la arquitectura de trazabilidad al CTO.',       activityDate: daysAgo(2) },
    // Last week
    { contactId: cids[0],  opportunityId: oids[10], type: 'EMAIL',   description: 'Propuesta de integración con Yape y Plin enviada.',             activityDate: daysAgo(5) },
    { contactId: cids[9],  opportunityId: oids[29], type: 'MEETING', description: 'Kickoff de proyecto — firma de contrato nómina minería.',       activityDate: daysAgo(5) },
    { contactId: cids[7],  opportunityId: oids[20], type: 'CALL',    description: 'Aclaración de requerimientos del módulo de arrendamientos.',    activityDate: daysAgo(6) },
    { contactId: cids[3],  opportunityId: oids[11], type: 'NOTE',    description: 'Cliente interesado en integración con SAP. Pendiente cotizar.',  activityDate: daysAgo(7) },
    { contactId: cids[6],  opportunityId: oids[12], type: 'MEETING', description: 'Workshop de UX con equipo pedagógico de EduTech.',              activityDate: daysAgo(8) },
    { contactId: cids[8],  opportunityId: oids[13], type: 'CALL',    description: 'Revisión de módulo de pagos y carrito de compras.',             activityDate: daysAgo(9) },
    // Two weeks ago
    { contactId: cids[11], opportunityId: oids[30], type: 'EMAIL',   description: 'Confirmación de recepción de entregable v1.0 - app vehicular.', activityDate: daysAgo(10) },
    { contactId: cids[56], opportunityId: oids[1],  type: 'EMAIL',   description: 'Primer contacto — envío de dossier de servicios.',              activityDate: daysAgo(11) },
    { contactId: cids[10], opportunityId: oids[21], type: 'MEETING', description: 'Revisión de wireframes del dashboard de campañas.',             activityDate: daysAgo(12) },
    { contactId: cids[12], opportunityId: oids[15], type: 'CALL',    description: 'Demo del CRM — muy buena recepción del equipo de ventas.',      activityDate: daysAgo(13) },
    { contactId: cids[37], opportunityId: oids[27], type: 'MEETING', description: 'Presentación del módulo de gestión de activos mineros.',        activityDate: daysAgo(14) },
    // Older
    { contactId: cids[91], opportunityId: oids[35], type: 'NOTE',    description: 'Deal perdido — cliente decidió desarrollar solución in-house.', activityDate: daysAgo(16) },
    { contactId: cids[59], opportunityId: oids[4],  type: 'CALL',    description: 'Primer acercamiento — interés en facturación electrónica.',     activityDate: daysAgo(18) },
    { contactId: cids[62], opportunityId: oids[7],  type: 'MEETING', description: 'Discovery session para MVP de fintech.',                        activityDate: daysAgo(20) },
    { contactId: cids[4],  opportunityId: oids[32], type: 'EMAIL',   description: 'Cierre formal del proyecto portal de proveedores.',             activityDate: daysAgo(31) },
    { contactId: cids[58], opportunityId: oids[38], type: 'NOTE',    description: 'Perdido por precio — registrar para futura renegociación.',     activityDate: daysAgo(23) },
    { contactId: cids[13], opportunityId: oids[33], type: 'MEETING', description: 'Presentación de arquitectura open banking al board.',           activityDate: daysAgo(4)  },
    { contactId: cids[19], opportunityId: oids[22], type: 'CALL',    description: 'Reunión de avance del tracker logístico — demo en vivo.',       activityDate: daysAgo(3)  },
    { contactId: cids[30], opportunityId: oids[23], type: 'EMAIL',   description: 'Envío de casos de uso de la plataforma de microcréditos.',      activityDate: daysAgo(6)  },
    { contactId: cids[44], opportunityId: oids[34], type: 'MEETING', description: 'Entrega del módulo de onboarding digital — aprobado.',          activityDate: daysAgo(19) },
    { contactId: cids[16], opportunityId: oids[16], type: 'CALL',    description: 'Revisión técnica del backend de telemedicina.',                 activityDate: daysAgo(9)  },
    { contactId: cids[23], opportunityId: oids[17], type: 'EMAIL',   description: 'Propuesta de contenidos del campus e-learning enviada.',        activityDate: daysAgo(11) },
    { contactId: cids[64], opportunityId: oids[8],  type: 'CALL',    description: 'Primera llamada de descubrimiento — buen fit.',                 activityDate: daysAgo(14) },
    { contactId: cids[20], opportunityId: oids[14], type: 'NOTE',    description: 'Referido por Alejandro Torres — potencial cliente A.',          activityDate: daysAgo(25) },
    { contactId: cids[92], opportunityId: oids[36], type: 'NOTE',    description: 'Proceso perdido — presupuesto insuficiente este trimestre.',    activityDate: daysAgo(22) },
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

  // Activities
  const actsData = buildActivities(cids, oids);
  const acts = await Promise.all(
    actsData.map(a => prisma.activity.create({ data: { ...a, userId: admin.id } }))
  );
  console.log(`  ✓ ${acts.length} activities`);

  // Summary
  const byStatus = CONTACTS.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});
  const byStage = oppsData.reduce((acc, o) => {
    acc[o.stage] = (acc[o.stage] || 0) + 1;
    return acc;
  }, {});

  console.log('\n  Contacts by status:');
  Object.entries(byStatus).forEach(([s, n]) => console.log(`    ${s.padEnd(12)} ${n}`));
  console.log('\n  Pipeline by stage:');
  Object.entries(byStage).forEach(([s, n]) => console.log(`    ${s.padEnd(14)} ${n}`));

  console.log('\n✅  Seed complete!');
  console.log('   admin@maocrm.dev  /  Admin1234!');
  console.log('   user@maocrm.dev   /  User1234!');
}

seed()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
