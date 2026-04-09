const { execSync } = require('child_process');
const assert = require('assert');

// Basic smoke test for CLI
try {
  const output = execSync('node dist/index.js scan https://example.com --checks security,performance,accessibility,load,custom --max-pages 1', { encoding: 'utf8' });
  assert(output.includes('Scan completed'));
  assert(output.match(/Security|Performance|Accessibility|Load|Custom/i));
  console.log('CLI smoke test passed.');
} catch (e) {
  console.error('CLI smoke test failed:', e.message);
  process.exit(1);
}
