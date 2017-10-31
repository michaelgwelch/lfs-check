#! /usr/bin/env node
/* eslint-disable no-console */
const {
  checkCommit, normalizeCommitish, getCommitsAheadOfMaster, getCurrentBranch,
} = require('./index');
require('colors'); // Has useful side effects: Adds color options to strings.


const userArgs = process.argv.slice(2);
if (userArgs.length > 1) {
  console.log('Usage: lfs-check [commit | branch]');
  process.exit(-1);
}

async function checker(commit) {
  try {
    const normalizedCommit = await normalizeCommitish(commit);
    console.log(`Checking commit ${normalizedCommit}`);
    const binaries = await checkCommit(commit);
    if (binaries.length > 0) {
      console.log('Binary files found:'.red);
      binaries.forEach((binary) => {
        const file = binary.split(':')[1];
        console.log(`  ${file}`.red);
      });
    }
  } catch (e) {
    console.log(e.message);
  }
}

const userArgPromise = (userArgs.length === 0)
  ? getCurrentBranch()
  : Promise.resolve(userArgs[0]);

// const commitPromises = userArgPromise.then(getCommitsAheadOfMaster);

// commitPromises.then(commits => commits.forEach(checker));

userArgPromise
  .then(getCommitsAheadOfMaster)
  .then(commits => commits.forEach(checker));
