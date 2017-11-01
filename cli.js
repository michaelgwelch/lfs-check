#! /usr/bin/env node
/* eslint-disable no-console */
const {
  checkCommit, normalizeCommitish, getCommitsAheadOfMaster, getCurrentBranch,
} = require('./index');
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
if (userArgs._.length > 1) {
  console.log('Usage: lfs-check [commit | branch]');
  process.exit(-1);
}

const binaryFileInspection = {
  id: 'FILE001',
  name: 'no-binary-files',
  category: 'File metadata checks',
  description: 'Reports binary files that were detected in a commit. Binary files should be tracked using git lfs rather than being checked directly into a repo.',
};


async function gatherInspections(commit) {
  try {
    const normalizedCommit = await normalizeCommitish(commit);
    const result = { commit: normalizedCommit, inspections: [] };
    const binaries = await checkCommit(commit);
    if (binaries.length > 0) {
      binaries.forEach((binary) => {
        const file = binary.split(':')[1];
        result.inspections.push(file);
      });
    }
    return result;
  } catch (e) {
    console.log(e.message);
    return { commit, inspections: [] };
  }
}

async function consoleChecker(commit) {
  const { id, message } = commit;
  const inspectionResult = await gatherInspections(id);

  console.log(`${inspectionResult.commit}: ${message.substring(0, 52)}`);
  if (inspectionResult.inspections.length > 0) {
    console.log('Binary files found:'.red);
    inspectionResult.inspections.forEach((binary) => {
      console.log(`  ${binary}`.red);
    });
  }
}

let binaryFileInspectionRegistered = false;

async function teamcityChecker(commit) {
  const inspectionResult = await gatherInspections(commit.id);

  if (inspectionResult.inspections.length > 0) {
    if (!binaryFileInspectionRegistered) {
      binaryFileInspectionRegistered = true;
      tsm.inspectionType(binaryFileInspection);      
    }
    inspectionResult.inspections.forEach((binary) => {
      tsm.inspection({
        typeId: 'FILE001', message: `Binary file '${binary}' detected in commit '${commit.id}'`, file: binary, SEVERITY: 'ERROR',
      });
    });
  }
}




const userArgPromise = (userArgs._.length === 0)
  ? getCurrentBranch()
  : Promise.resolve(userArgs._[0]);

userArgPromise
  .then(getCommitsAheadOfMaster)
  // using eachLimit to easily keep the commit results in order
  .then(commits => async.eachLimit(commits, 1, userArgs.reporter === 'teamcity' ? teamcityChecker : consoleChecker));
