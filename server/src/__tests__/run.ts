type TestCase = {
  name: string;
  run: () => void | Promise<void>;
};

export {};

process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/testdb';

const [{ runAuthTests }, { runCompletenessTests }, { runListingFieldTests }, { runSearchFilterTests }] =
  await Promise.all([
    import('./auth.test.ts'),
    import('./completeness.test.ts'),
    import('./listingFields.test.ts'),
    import('./searchFilters.test.ts'),
  ]);

const tests: TestCase[] = [
  { name: 'auth helpers', run: runAuthTests },
  { name: 'listing completeness', run: runCompletenessTests },
  { name: 'listing field rules', run: runListingFieldTests },
  { name: 'search filter helpers', run: runSearchFilterTests },
];

let failed = false;

for (const testCase of tests) {
  try {
    await testCase.run();
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
