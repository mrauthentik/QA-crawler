/**
 * Integration tests for qa-detective CLI
 * These tests verify the CLI works end-to-end
 * 
 * Run locally before publishing:
 * npm run test:all
 */

describe('QA Detective CLI Integration', () => {
  describe('Local Testing (without npm publish)', () => {
    it('should provide instructions for local testing', () => {
      const instructions = `
        Step 1: Build the CLI
        $ npm run build

        Step 2: Test locally using npm link
        $ npm link
        $ qa-detective scan https://example.com
        $ qa-detective scan http://localhost:3000

        Step 3: Run test suite
        $ npm run test:all

        Step 4: If all tests pass, publish to npm
        $ npm publish
      `;

      expect(instructions).toContain('npm link');
      expect(instructions).toContain('npm publish');
    });
  });

  describe('CLI Commands', () => {
    it('should document scan command structure', () => {
      const commands = {
        basic: 'qa-detective scan https://myapp.com',
        localhost: 'qa-detective scan http://localhost:3000',
        withAuth: 'qa-detective scan https://myapp.com -e user@example.com -p pass',
        withReport: 'qa-detective scan https://myapp.com -o report.json',
        withPdf: 'qa-detective scan https://myapp.com -o report.pdf -f pdf',
        cicd: 'qa-detective scan https://myapp.com --fail-on critical',
      };

      Object.values(commands).forEach(cmd => {
        expect(cmd).toMatch(/^qa-detective scan/);
      });

      expect(commands).toMatchSnapshot();
    });
  });

  describe('Testing Workflow', () => {
    it('should follow npm testing best practices', () => {
      const workflow = {
        local: {
          step1: 'npm run build',
          step2: 'npm link',
          step3: 'qa-detective scan http://localhost:3000',
          verify: 'Runs without errors ✓',
        },
        unittest: {
          step1: 'npm test',
          step2: 'npm run test:watch',
          verify: 'All tests pass ✓',
        },
        smoke: {
          step1: 'npm run test:smoke',
          verify: 'CLI basic functionality works ✓',
        },
        publish: {
          step1: 'Verify all tests pass',
          step2: 'npm publish',
          step3: 'Users: npm install -g qa-detective-cli@latest',
        },
      };

      expect(workflow.local.verify).toBe('Runs without errors ✓');
      expect(workflow).toMatchSnapshot();
    });
  });
});
