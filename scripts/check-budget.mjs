import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST_ASSETS = join(process.cwd(), 'dist', 'assets');
const MAX_INITIAL_JS_GZIP_BYTES = 200 * 1024; // 200 KB gzip budget

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function main() {
  let files;
  try {
    files = readdirSync(DIST_ASSETS);
  } catch {
    console.error('ERROR: dist/assets not found. Run `npm run build` first.');
    process.exit(1);
  }

  const indexHtml = readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf-8');
  let initialJsRaw = 0;
  let initialJsGzip = 0;
  let totalCssGzip = 0;

  console.log('\n=== Bundle Budget Report ===');
  for (const file of files.sort()) {
    const fullPath = join(DIST_ASSETS, file);
    if (!statSync(fullPath).isFile()) continue;
    const content = readFileSync(fullPath);
    const gz = gzipSync(content).length;

    const isInitialEntry = indexHtml.includes(file);
    if (file.endsWith('.js')) {
      const label = isInitialEntry ? 'INITIAL JS' : 'LAZY JS   ';
      console.log(`  [${label}] ${file}: ${formatKb(content.length)} raw | ${formatKb(gz)} gzip`);
      if (isInitialEntry) {
        initialJsRaw += content.length;
        initialJsGzip += gz;
      }
    } else if (file.endsWith('.css')) {
      totalCssGzip += gz;
      console.log(`  [CSS       ] ${file}: ${formatKb(content.length)} raw | ${formatKb(gz)} gzip`);
    }
  }

  console.log('----------------------------');
  console.log(`  Initial JS total : ${formatKb(initialJsRaw)} raw | ${formatKb(initialJsGzip)} gzip (budget: 200.00 KB)`);
  console.log(`  Total CSS gzip   : ${formatKb(totalCssGzip)}`);
  console.log('============================\n');

  if (initialJsGzip > MAX_INITIAL_JS_GZIP_BYTES) {
    console.error(
      `BUDGET EXCEEDED: Initial JS gzip (${formatKb(initialJsGzip)}) > 200.00 KB.`,
    );
    process.exit(1);
  }

  console.log('PASS: Initial JS bundle is within the 200 KB gzip budget.');
}

main();
