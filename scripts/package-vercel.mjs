import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.argv.length !== 3) {
  console.error('Usage: node scripts/package-vercel.mjs <reviewed-commit>');
  process.exit(1);
}

const repo = fileURLToPath(new URL('..', import.meta.url));
const revision = execFileSync('git', ['rev-parse', '--verify', '--end-of-options', `${process.argv[2]}^{commit}`], {
  cwd: repo,
  encoding: 'utf8',
}).trim();
const inputs = [
  'client/index.html', 'client/package.json', 'client/package-lock.json', 'client/public',
  'client/src', 'client/postcss.config.js', 'client/tailwind.config.js',
  'client/tsconfig.json', 'client/tsconfig.app.json', 'client/tsconfig.node.json', 'client/vite.config.ts',
  'server/package.json', 'server/package-lock.json', 'server/src', 'server/tsconfig.json',
  'server/prisma/schema.prisma', 'scripts/vercel',
];

// Reject tracked symlinks and common credential files before extracting the build inputs.
const tree = execFileSync('git', ['ls-tree', '-rz', revision, '--', ...inputs], { cwd: repo, encoding: 'utf8' });
for (const entry of tree.split('\0').filter(Boolean)) {
  const tab = entry.indexOf('\t');
  const name = entry.slice(tab + 1);
  if (!/^100(?:644|755) /.test(entry) || /^(?:\.env(?:\.|$))|\.(?:key|pem|pfx|p12)$/i.test(basename(name))) {
    throw new Error(`Unexpected deployment input: ${name}`);
  }
}

const scratch = mkdtempSync(join(tmpdir(), 'repairvantage-build-'));
let artifact;

try {
  // Working-copy secrets, stale output, and Vercel settings stay outside the reviewed archive.
  const archive = join(scratch, 'source.tar');
  execFileSync('git', ['archive', '--output', archive, revision, '--', ...inputs], { cwd: repo });
  execFileSync('tar', ['-xf', archive, '-C', scratch]);
  const client = join(scratch, 'client');
  const server = join(scratch, 'server');
  // Child build tools don't need application credentials or inherited Vite settings.
  const allowedEnv = ['PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL', 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY'];
  const env = Object.fromEntries(allowedEnv.flatMap(key => process.env[key] ? [[key, process.env[key]]] : []));
  for (const cwd of [client, server]) {
    execFileSync('npm', ['ci', '--include=dev', '--no-audit', '--no-fund'], { cwd, env, stdio: 'inherit' });
    execFileSync('npm', ['run', 'build'], { cwd, env, stdio: 'inherit' });
  }

  artifact = mkdtempSync(join(tmpdir(), 'repairvantage-vercel-'));
  const deployFiles = join(scratch, 'scripts', 'vercel');
  for (const name of ['index.js', 'vercel.json']) copyFileSync(join(deployFiles, name), join(artifact, name));
  for (const name of ['package.json', 'package-lock.json']) copyFileSync(join(server, name), join(artifact, name));
  mkdirSync(join(artifact, 'prisma'));
  copyFileSync(join(server, 'prisma', 'schema.prisma'), join(artifact, 'prisma', 'schema.prisma'));
  cpSync(join(server, 'dist'), join(artifact, 'dist'), { recursive: true, filter: path => !path.endsWith('.map') });
  cpSync(join(client, 'dist'), join(artifact, 'public'), {
    recursive: true,
    filter: path => {
      const name = basename(path);
      if (name.startsWith('.') || /\.(?:key|pem|pfx|p12|map)$/i.test(name)) {
        throw new Error(`Unexpected public artifact: ${name}`);
      }
      return true;
    },
  });

  for (const entry of ['public/index.html', 'dist/index.js', 'dist/identity.mjs']) {
    if (!existsSync(join(artifact, entry))) throw new Error(`Missing deployment entry: ${entry}`);
  }
  console.log(`Prepared ${revision} in ${artifact}`);
} catch (error) {
  if (artifact) rmSync(artifact, { recursive: true, force: true });
  throw error;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
