#! /usr/bin/env node
/* eslint-disable no-console */
const cp = require('child_process');
const util = require('util');
const _ = require('lodash');

const exec = util.promisify(cp.exec);

const EmptyTreeSha = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';


async function normalizeCommitish(id) {
  try {
    const { stdout } = await exec(`git rev-parse ${id}`);
    return stdout.trim();
  } catch (e) {
    throw new Error(`'${id}' is not a valid commit id`);
  }
}

/**
 * Returns an object composed from key-value pairs. If a key is repeated then the value of that key
 * will be an array containing all of the values associated with that key.
 * <pre><code>
 * $ fromPairsRepeatingKeys([['one', 'hi'], ['two', 'bye'], ['one', 'hello']])
 * { one: [ 'hi', 'hello' ], two: 'bye' }
 * </code></pre>
 * @param {Array.<Array.<*>>} pairs - The key-value pairs
 */
function fromPairsRepeatingKeys(pairs) {
  const result = _.stubObject();

  pairs.forEach((pair) => {
    const [key, value] = pair;

    if (_.has(result, key)) {
      if (!_.isArray(result[key])) {
        const originalValue = result[key];
        result[key] = _.stubArray();
        result[key].push(originalValue);
      }
      result[key].push(value);
    } else {
      result[key] = value;
    }
  });

  return result;
}

/**
 * Represents a git commit
 * @property {string} tree - The sha of the tree of this commit
 * @property {Array.<string>} parents - The sha hashes of the parent commits
 * @property {string} id - The identifier of this commit (A sha hash, a branch name, HEAD, etc.)
 * @property {boolean} isMerge - Does this commit represent a merge commit?
 * (Equivalent to having 2 or more parents)
 * @property {boolean} isRoot - Is this the first commit in the repo?
 * (Equivalent to having 0 parents)
 */
class Commit {
  /**
   * Creates a Commit instance
   * @param {Object} o - A commit like object
   * @param {string} o.tree - The sha of the tree of this commit
   * @param {Array.<string>} o.parent - The sha hashes of the parent
   * @param {string} o.id - The identifier of this commit (A sha hash, a branch name, HEAD, etc.)
   */
  constructor(o) {
    const { parent, tree, id } = o;
    this.parents = parent || [];
    this.tree = tree;
    this.id = id;
    this.isMerge = parent.length > 1;
    this.isRoot = parent.length === 0;
  }

  static fromBuffer(buffer, id) {
    const pairs = _
      .chain(buffer.split('\n'))
      .takeWhile(line => !line.startsWith('author'))
      .map(line => line.split(/\s+/))
      .value();

    const commit = fromPairsRepeatingKeys(pairs);

    commit.id = id;

    // ensure `parent` is an array
    // If it didn't exist in pairs, then parent won't exist, create it as an empty array.
    // If it appeared once in pairs, then parent will be a scalar, convert to single element array
    if (!_.isArray(commit.parent)) {
      if (commit.parent) {
        commit.parent = [commit.parent];
      } else {
        commit.parent = [];
      }
    }

    return new Commit(commit);
  }
}

/**
 * Retrieves a commit object from the current git repository
 * @param {string} id - A commit identifier (sha, branch name, HEAD, etc.)
 * @returns {Promise<GitCommit>} Promise object that will return the commit.
 */
async function getCommit(id) {
  try {
    const { stdout } = await exec(`git cat-file -p ${id}`);
    return Commit.fromBuffer(stdout.trim(), id);
  } catch (e) {
    throw new Error(`'${id}' is not a valid commit id`);
  }
}


/**
 * Returns a list of files that changed as a result of the specified commit.
 * @param {Commit} commit - The hash code of the commit to inspect
 * @returns {Array.<string>} - An array of file names.
 */
async function getChangedFilesForCommit(commit) {
  if (commit.isMerge) {
    const { stdout } = await exec(`git diff-tree --cc --name-only ${commit.id}`);
    // Skip the first result which is just the commit identifier
    return stdout.trim().split('\n').slice(1);
  }

  const parentTree = (commit.isRoot) ? EmptyTreeSha : `${commit.id}^`;

  // Single parent commit
  const { stdout } = await exec(`git diff --name-only ${parentTree} ${commit.id}`);
  return stdout.trim().split('\n');
}

/**
 * Uses git detection powers to decide if the specified version of the file in the commit
 * specified by sha is binary.
 * @param {*} sha
 * @param {*} file
 */
async function isBinary(sha, file) {
  const { stdout } = await exec(`git diff-tree --numstat ${EmptyTreeSha} ${sha} -- ${file}`);

  // This is a magic pattern in the output when file is binary. See notes.md
  return stdout.includes('-\t-\t');
}

/**
 * Checks the changed files in the specified commit and returns an array of
 * binary files that are checked into the repository. The files are identified in the 
 * format 'commit:path'.
 * @param {Commit|string} [commit = 'HEAD'] commit - A commit identifier
 * @returns {Array.<string>} A list of binary files. Each file is identified by commit
 * and path in the format commit:path (eg. d7abc6:bin/image.png)
 */
async function checkCommit(commit = 'HEAD') {
  const actualCommit = (_.isString(commit)) ? await getCommit(commit) : commit;
  const files = await getChangedFilesForCommit(actualCommit);

  const results = await Promise.all(files.map(file => isBinary(actualCommit.id, file)));

  return _
    .chain(_.zip(files, results))
    .filter(pair => pair[1])
    .map(pair => `${actualCommit.id.slice(0, 7)}:${pair[0]}`)
    .value();
}

// /**
//  * Checks all the files o
//  * @param {*} branch
//  */
// async function checkBranch(branch) {
//   let tovisit = [branch];
//   const visited = [];


//   do {
//     const sha = tovisit.pop();
//     if (visited.indexOf(sha) >= 0) {
//       continue;
//     }
//     const commit = await getCommit(sha);
//     const errors = await checkCommit(commit);
//     if (errors.length > 0) {
//       console.log(errors);
//     }
//     visited.push(sha);
//     tovisit = tovisit.concat(commit.parents);
//   } while (tovisit.length > 0);
// }

module.exports = { checkCommit };

const userArgs = process.argv.slice(2);
if (userArgs.length === 0) {
  console.log('Usage: lfs-check commit');
  process.exit(-1);
}

async function checker(commit) {
  try {
    const normalizedCommit = await normalizeCommitish(commit);
    console.log(`Checking commit ${normalizedCommit.slice(0, 6)}`);
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
