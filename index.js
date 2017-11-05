#! /usr/bin/env node
/* eslint-disable no-console */
const {
  gitLogNumStat,
} = require('./lib/git-log');
require('colors'); // Has useful side effects: Adds color options to strings.
const async = require('async');
const tsm = require('teamcity-service-messages');
const Message = require('teamcity-service-messages/lib/message');
const parseArgs = require('minimist');

tsm.stdout = true;

[
  'inspectionType',
  'inspection',
]
  .forEach((message) => {
    tsm[message] = (args) => {
      const output = new Message(message, args).toString();
      if (tsm.stdout) {
        console.log(output);
        return tsm;
      }

      return output;
    };
  });

const userArgs = parseArgs(process.argv.slice(2));
if (userArgs._.length > 2) {
  console.log('Usage: lfs-check [commitish] [base-commit]');
  process.exit(-1);
}

const binaryFileInspection = {
  id: 'FILE001',
  name: 'no-binary-files',
  category: 'File metadata checks',
  description: 'Reports binary files that were detected in a commit. Binary files should be tracked using git lfs rather than being checked directly into a repo.',
};

async function consoleChecker(commit) {
  const { id, message, binaries } = commit;

  console.log(`${id} ${message}`);
  if (binaries.length > 0) {
    console.log('Binary files found:'.red);
    binaries.forEach((binary) => {
      console.log(`  ${binary}`.red);
    });
  }
}

let binaryFileInspectionRegistered = false;

async function teamcityChecker(commit) {
  const { binaries } = commit;

  if (binaries.length > 0) {
    if (!binaryFileInspectionRegistered) {
      binaryFileInspectionRegistered = true;
      tsm.inspectionType(binaryFileInspection);
    }
    binaries.forEach((binary) => {
      tsm.inspection({
        typeId: 'FILE001', message: `Binary file '${binary}' detected in commit '${commit.id}'`, file: binary, SEVERITY: 'ERROR',
      });
      tsm.setParameter({ name: 'binary-file-errors', value: true });
    });
  }
}

const compareCommit = userArgs._[0] || 'HEAD';
const baseCommit = userArgs._[1];

const logResults = gitLogNumStat(compareCommit, baseCommit);

logResults
  // using eachLimit to easily keep the commit results in order
  .then(commits => async.eachLimit(commits, 1, userArgs.reporter === 'teamcity' ? teamcityChecker : consoleChecker));
