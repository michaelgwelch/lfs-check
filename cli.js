#! /usr/bin/env node
/* eslint-disable no-console */
const { checkCommit, normalizeCommitish } = require('./index');

const userArgs = process.argv.slice(2);
if (userArgs.length === 0) {
  console.log('Usage: lfs-check commit');
  process.exit(-1);
}

async function checker(commit) {
  try {
    const normalizedCommit = await normalizeCommitish(commit);
    console.log(`Checking commit ${normalizedCommit}`);
    const binaries = await checkCommit(commit);
    if (binaries.length > 0) {
      console.log('Binary files found:');
      binaries.forEach((binary) => {
        const file = binary.split(':')[1];
        console.log(`  ${file}`);
      });
    }
  } catch (e) {
    console.log(e.message);
  }
}

checker(userArgs[0]);
