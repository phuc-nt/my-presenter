#!/usr/bin/env node
import { makeProgram } from '../src/cli.js';

makeProgram().parseAsync(process.argv).catch(err => {
  // zod errors are long; surface the first few issues in a readable form
  if (err?.issues) {
    console.error('invalid deck JSON:');
    for (const i of err.issues.slice(0, 12)) console.error(`  ${i.path.join('.') || '<root>'}: ${i.message}`);
    if (err.issues.length > 12) console.error(`  … ${err.issues.length - 12} more`);
  } else console.error(err?.message ?? err);
  process.exitCode = 1;
});
