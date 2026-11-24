const { createHash } = require('node:crypto');

// Preserve the legacy ProjectList fixtures, not the contradictory Dashboard totals.
// Provenance: main bd46f74aed4af2b913acabfc9c4d14a533961cf3, client/src/pages/ProjectList.tsx.
const fixtures = [
  ['1', 'Kitchen Renovation', 'IN_PROGRESS', 15000, '2023-08-30'],
  ['2', 'Bathroom Remodel', 'PLANNED', 8500, '2023-09-15'],
  ['3', 'Deck Repair', 'IN_PROGRESS', 4200, '2023-07-25'],
  ['4', 'Basement Finishing', 'PLANNED', 22000, '2023-10-10'],
  ['5', 'Roof Replacement', 'COMPLETED', 12800, '2023-06-15'],
];

class DemoSeedError extends Error {}

function normalizedEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new DemoSeedError('Supply an existing verified account with --email.');
  }
  return email;
}

function fixtureId(userId, legacyId) {
  // Account-scoped IDs make reruns additive without matching or overwriting user project names.
  return `demo-legacy-v1-${createHash('sha256').update(`${userId}:${legacyId}`).digest('hex')}`;
}

async function seedDemo(prisma, email, { apply = false } = {}) {
  const accountEmail = normalizedEmail(email);
  return prisma.$transaction(async tx => {
    const user = await tx.user.findUnique({ where: { email: accountEmail }, select: { id: true, emailVerified: true } });
    if (!user?.emailVerified) throw new DemoSeedError('The target account must already exist and have a verified email.');

    let created = 0;
    let skipped = 0;
    const projects = [];
    for (const [legacyId, name, status, budget, endDate] of fixtures) {
      const id = fixtureId(user.id, legacyId);
      const existing = await tx.project.findUnique({ where: { id }, select: { userId: true } });
      if (existing && existing.userId !== user.id) throw new DemoSeedError('A demo fixture ID belongs to another account; no records were changed.');
      if (existing) skipped++;
      else if (apply) {
        // createMany avoids RETURNING newer optional columns absent from the original hosted schema.
        await tx.project.createMany({ data: [{
          id, userId: user.id, name, status, budget, endDate: new Date(`${endDate}T00:00:00.000Z`),
          description: 'Demonstration fixture copied from the original RepairVantage mock project list. Dates and budgets are sample data.',
        }] });
        created++;
      }
      projects.push({ name, status, budget, endDate, action: existing ? 'skip' : apply ? 'create' : 'would-create' });
    }
    return { mode: apply ? 'apply' : 'dry-run', created, skipped, wouldCreate: apply ? 0 : fixtures.length - skipped, projects };
  });
}

async function main(args = process.argv.slice(2), env = process.env) {
  const apply = args.includes('--apply');
  const emailIndex = args.indexOf('--email');
  if (emailIndex < 0 || args.length !== (apply ? 3 : 2) || args.some((arg, i) => i !== emailIndex + 1 && !['--email', '--apply'].includes(arg))) {
    throw new DemoSeedError('Usage: node server/scripts/seed-demo.cjs --email account@example.com [--apply]');
  }
  const email = normalizedEmail(args[emailIndex + 1]);
  // Never load dotenv or fall back to application/migration credentials: target selection is explicit.
  const value = env.DEMO_DATABASE_URL;
  if (!value || !/^postgres(?:ql)?:\/\//.test(value) || !URL.canParse(value)) {
    throw new DemoSeedError('Set DEMO_DATABASE_URL explicitly to the intended PostgreSQL target.');
  }
  const url = new URL(value);
  if (url.searchParams.getAll('schema').some(schema => schema !== 'public')) throw new DemoSeedError('Demo data must use the public schema.');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
    // Match production certificate and hostname verification for remote one-off writes.
    url.searchParams.set('sslmode', 'verify-full');
  }
  const { createPrismaClient } = require('../dist/db');
  const prisma = createPrismaClient(url.href);
  try {
    return await seedDemo(prisma, email, { apply });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {
    // Driver diagnostics can contain credentials; only print messages authored by this script.
    console.error(error instanceof DemoSeedError ? error.message : 'Demo seed failed; connection and account details were not printed.');
    process.exitCode = 1;
  });
}

module.exports = { seedDemo, fixtureId, main };
