type TestCase = {
  name: string;
  run: () => void;
};

process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/testdb';

// Load test modules only after required env vars are present.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runAuthTests } = require('./auth.test');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runCompletenessTests } = require('./completeness.test');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runSearchFilterTests } = require('./searchFilters.test');

const tests: TestCase[] = [
  { name: 'auth helpers', run: runAuthTests },
  { name: 'listing completeness', run: runCompletenessTests },
  { name: 'search filter helpers', run: runSearchFilterTests },
];

let failed = false;

for (const testCase of tests) {
  try {
    testCase.run();
    console.log(`PASS ${testCase.name}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${testCase.name}`);
    console.error(error);
  }
}

if (failed) {
  process.exitCode = 1;
}
