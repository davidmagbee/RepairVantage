import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { connect } from 'node:net';
import { mkdir, mkdtemp, readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(new URL('../client/package.json', import.meta.url));
const { CoverageReport } = require('monocart-coverage-reports');
const { testDatabaseUrl } = require('../server/test/database-url.cjs');
const ts = require('typescript');
const sourceDirs = ['client/src', 'server/src', 'scripts/vercel'];
const sourceFile = /\.(?:[cm]?[jt]s|[jt]sx)$/;

function applicationSource(path) {
  return sourceDirs.some(directory => path.startsWith(`${directory}/`))
    && sourceFile.test(path) && !/\.d\.[cm]?ts$/.test(path) && !path.includes('/generated/');
}

function resolveMap(map, fileName) {
  // Vite maps may contain only a basename. Preserve the full path to distinguish similarly named modules.
  const { sourceRoot, sources, ...rest } = map;
  return {
    ...rest,
    sources: sources.map(source => pathToFileURL(resolve(dirname(fileName), sourceRoot || '', source)).href),
  };
}

function run(program, args, cwd, env) {
  const result = spawnSync(program, args, { cwd: join(root, cwd), env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${program} ${args.join(' ')} failed`);
}

function browserServerPortInUse() {
  return new Promise(resolve => {
    const socket = connect({ host: '127.0.0.1', port: 4000 });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', error => resolve(error.code !== 'ECONNREFUSED'));
  });
}

const [coverageOption, ...extraArguments] = process.argv.slice(2);
const requestedFloor = coverageOption?.match(/^--minimum-lines=(\d+)$/)?.[1];
const minimumLines = coverageOption === '--check' ? 100 : Number(requestedFloor ?? 0);
if (extraArguments.length || (coverageOption && coverageOption !== '--check' && requestedFloor === undefined)
    || minimumLines > 100) {
  throw new Error('Usage: node scripts/coverage.mjs [--check | --minimum-lines=<0-100>]');
}
await mkdir(join(root, 'coverage'), { recursive: true });
const output = await mkdtemp(join(root, 'coverage/run-'));
const nodeData = join(output, 'node');
const browserData = join(output, 'browser');
const vercelEntry = join(output, 'vercel', 'index.js');

async function collect() {
  testDatabaseUrl();
  await Promise.all([mkdir(nodeData), mkdir(browserData)]);
  run('npm', ['run', 'build'], 'server', process.env);
  const nodeEnv = {
    ...process.env, NODE_V8_COVERAGE: nodeData, REPAIRVANTAGE_VERCEL_TEST_DIR: dirname(vercelEntry),
  };
  run(process.execPath, ['--test', 'test/*.test.cjs'], 'server', nodeEnv);

  if (await browserServerPortInUse()) throw new Error('The isolated browser test requires loopback port 4000');
  const backend = spawn(process.execPath, ['test/browser-server.cjs'], {
    cwd: join(root, 'server'), env: nodeEnv, stdio: 'inherit',
  });
  const backendExit = new Promise((resolve, reject) => {
    backend.once('error', reject);
    backend.once('exit', resolve);
  });

  try {
    let ready = false;
    for (let attempt = 0; attempt < 40 && backend.exitCode === null; attempt += 1) {
      const response = await fetch('http://127.0.0.1:4000/ready', { signal: AbortSignal.timeout(1000) }).catch(() => null);
      if (response?.ok) {
        ready = true;
        break;
      }
      await delay(250);
    }
    if (!ready) throw new Error('The disposable browser API did not become ready');
    run('npm', ['test', '--', '--forbid-only'], 'client', {
      ...process.env, CI: '1', REAL_API: '1', REPAIRVANTAGE_BROWSER_COVERAGE: browserData,
    });
  } finally {
    backend.kill('SIGTERM');
    // A graceful exit flushes Node's coverage from requests made by Chromium.
    await backendExit;
  }
}

await collect();

const report = new CoverageReport({
  name: 'RepairVantage application coverage',
  baseDir: root,
  outputDir: join(output, 'report'),
  // Keep the machine-readable report on the same V8 metric used by the gate.
  reports: ['v8', 'v8-json', 'console-details'],
  v8Ignore: false,
  sourceFilter: applicationSource,
  outputFilter: ({ sourcePath }) => applicationSource(sourcePath),
  all: {
    dir: sourceDirs.map(directory => join(root, directory)),
    filter: path => applicationSource(relative(root, path)),
    // Compile unloaded TypeScript to account for its statements and branches as uncovered.
    transformer(entry) {
      const fileName = fileURLToPath(entry.url);
      if (!/\.(?:[cm]?ts|[jt]sx)$/.test(fileName)) return;
      const compiled = ts.transpileModule(entry.source, {
        fileName,
        compilerOptions: { target: ts.ScriptTarget.ESNext, jsx: ts.JsxEmit.ReactJSX, sourceMap: true, inlineSources: true },
      });
      entry.source = compiled.outputText;
      entry.sourceMap = resolveMap(JSON.parse(compiled.sourceMapText), fileName);
    },
  },
});

const serverDistUrl = pathToFileURL(join(root, 'server/dist')).href + '/';
const stagedEntryUrl = pathToFileURL(vercelEntry).href;
const wrapperFile = join(root, 'scripts/vercel/index.js');
for (const file of await readdir(nodeData)) {
  const { result } = JSON.parse(await readFile(join(nodeData, file), 'utf8'));
  const entries = result.filter(({ url }) => url === stagedEntryUrl
    || (url.startsWith(serverDistUrl) && !url.includes('/generated/')));
  for (const entry of entries) {
    // The smoke test copies the exact deployment entry. Attribute its counters to the checked-in source.
    if (entry.url === stagedEntryUrl) {
      entry.url = pathToFileURL(wrapperFile).href;
      entry.source = await readFile(wrapperFile, 'utf8');
      continue;
    }
    const fileName = fileURLToPath(entry.url);
    entry.source = await readFile(fileName, 'utf8');
    entry.sourceMap = resolveMap(JSON.parse(await readFile(`${fileName}.map`, 'utf8')), fileName);
    entry.sourceMap.sourcesContent = await Promise.all(entry.sourceMap.sources.map(source => readFile(fileURLToPath(source), 'utf8')));
  }
  if (entries.length) await report.add(entries);
}
for (const file of await readdir(browserData)) {
  const entries = JSON.parse(await readFile(join(browserData, file), 'utf8'))
    .filter(entry => applicationSource(`client${new URL(entry.url).pathname}`));
  for (const entry of entries) {
    const script = new URL(entry.url);
    const fileName = join(root, 'client', script.pathname);
    entry.url = pathToFileURL(fileName).href;
    const encodedMap = entry.source.match(/sourceMappingURL=data:application\/json;base64,([^\s]+)/)?.[1];
    if (!encodedMap) throw new Error(`Missing Vite source map for ${script.pathname}`);
    entry.sourceMap = resolveMap(JSON.parse(Buffer.from(encodedMap, 'base64').toString('utf8')), fileName);
  }
  if (entries.length) await report.add(entries);
}

const result = await report.generate();
if (!result?.files?.length) throw new Error('The coverage report has no application files');
const paths = new Set(result.files.map(file => file.sourcePath));
for (const directory of sourceDirs) {
  for (const file of await readdir(join(root, directory), { recursive: true })) {
    const path = `${directory}/${file}`;
    if (applicationSource(path) && !paths.has(path)) throw new Error(`Coverage report omitted ${path}`);
  }
}
console.log(`Coverage report: ${relative(root, join(output, 'report'))}`);
const lines = result.summary.lines;
if (!lines?.total) throw new Error('Coverage report contains no executable lines');
if (lines.covered * 100 < minimumLines * lines.total) {
  throw new Error(`Application line coverage is ${lines.pct}%. Required ${minimumLines}%.`);
}
