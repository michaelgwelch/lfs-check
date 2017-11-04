/* eslint-disable func-names, prefer-arrow-callback */
const { gitLogNumStat } = require('../lib/git-log');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const _ = require('lodash');
const assert = require('assert');


describe('gitLogNumStat', function () {
  it('expects a blank line between each commit returned by git. ' +
  'In addition any binary files should have numstat of -\\t-\\t. ' +
  'Any binary files deleted in a commit should not show up in that commit', async function () {
    // Call gitLogNumStat with two well known tags in this repo that can
    // be used for integration testing.
    const commits = await gitLogNumStat('compareForTests', 'baseForTests');
    const expected = [
      {
        id: 'd4b9b2b',
        binaries: [],
        message: 'Add readme about testing integration with git',
      },
      {
        id: '32bc0d5',
        binaries: [],
        message: 'Removing binary file',
      },
      {
        id: 'e7383af',
        binaries: [
          'build-passing.png',
        ],
        message: 'Add binary file',
      },
    ];

    assert(_.isEqual(commits, expected));
  });
});

describe('lfs-check', function () {
  describe('when using teamcity reporter', function () {
    it('includes buildProblem message by default', async function () {
      const { stdout } = await exec('node . compareForTests baseForTests --reporter=teamcity');
      const buildProblemPattern = /##teamcity\[buildProblem description='Binary files were detected'/;

      assert(buildProblemPattern.test(stdout), 'Expected build problem in output');
    });

    it('does not include build problem if --no-build-problem switch used', async function () {
      const { stdout } = await exec('node . compareForTests baseForTests --no-build-problem --reporter=teamcity');
      const buildProblemPattern = /##teamcity\[buildProblem description='Binary files were detected'/;

      assert(!buildProblemPattern.test(stdout), 'Expected no build problem in output');
    });

    it('includes one inspectionType if at least one binary found', async function () {
      const { stdout } = await exec('node . compareForTests baseForTests --no-build-problem --reporter=teamcity');
      const buildProblemPattern = /##teamcity\[inspectionType id='FILE001'/;

      assert(buildProblemPattern.test(stdout), 'Expected FILE001 inspectionType');
    });
  });
});
