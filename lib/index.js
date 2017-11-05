/* eslint-disable no-console */
const cp = require('child_process');
const util = require('util');

const exec = util.promisify(cp.exec);

function processCommitChunk(commitChunk) {
  const lines = commitChunk.split('\n').filter(line => line.length !== '');
  const commitObject = { id: undefined, binaries: [] };

  if (lines.length > 1) {
  // first line has the word commmit followed by the hash
    const splitIndex = lines[0].indexOf(' ');
    const hash = lines[0].substring(0, splitIndex);
    const words = lines[0].substring(splitIndex).trim();

    commitObject.id = hash;
    commitObject.message = words;

    const binaries = lines
      .slice(1)
      .filter(line => line.startsWith('-\t-\t'))
      .map(line => line.split(/-\t-\t/))
      .filter(splitResults => splitResults.length > 1)
      .map(splitResults => splitResults[1]);

    commitObject.binaries = binaries;
  }

  return commitObject;
}

async function gitLogNumStat(branch, base = 'master') {
  // git log --numstat --diff-filter=d --no-renames --format=format:'%h' master..branch
  //  --numstat Just show number of added and deleted lines in text files, but just two
  //      hypens (-) for binary files. The hyphens are used to find binaries with the regex
  //      /-\t-\t/ (that is two hyphens, each followed by a tab)
  //  --no-renames Don't use rename syntax. Instead show an added line and a deleted line. This
  //      avoids the problem of trying to parse the rename syntax in a string like the
  //      following: 'releases/alderaan/{ => images}/authentication-metasys-10-hld.jpg
  //  --diff-filter=d Don't show deleted files in the output. The --no-renames causes a rename to
  //      be shown as two files. But it's not clear which was added and which was removed. So I
  //      use this diff-filter to remove the deleted file leaving just the added file.
  //  --format=oneline --abbrev-commit:For the commit only print out the abbreviated hash and
  //      subject line( the files that changed are still printed as specified earlier)

  const { stdout } = await exec(`git log --numstat --no-renames --diff-filter=d --format=format:"%h %f" ${base}..${branch}`);

  // Output will be something like the following with a trailing blank line for each commit
  // commit 1ff8e4d
  // 2       2       releases/alderaan/scheduler/images/schedule-service-components.png
  // 182     3       releases/alderaan/scheduler/scheduler-database-design.md
  // -       -       releases/alderaan/scheduler/schedule-service-databse-design.xlsx
  //


  const commits = stdout
    .trim()
    .split(/\n\n/)
    .filter(entry => entry !== '')
    .map(processCommitChunk);

  return commits;
}

async function getCurrentBranch() {
  const { stdout } = await exec('git branch --no-color');
  return parseGitBranch(stdout);
}

module.exports = {
  gitLogNumStat, getCurrentBranch,
};

