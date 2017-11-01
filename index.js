const cp = require('child_process');
const util = require('util');
const _ = require('lodash');

const exec = util.promisify(cp.exec);

// My new version will be based on this
//  git log --numstat --no-renames  | awk '/^((-\t-\t)|(commit))/{print $0}'
// But this shows renames as one delete line and one add line.
// So I may want to run with renames first
// git log --numstat  | awk '/^((-\t-\t)|(commit))/{print $0}'
// and then check just those commits with renames.
// else find the tool to convert path with rename syntax to final name

const EmptyTreeSha = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';


async function normalizeCommitish(id) {
  try {
    const { stdout } = await exec(`git rev-parse --short ${id}`);
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
    .map(pair => `${actualCommit.id}:${pair[0]}`)
    .value();
}

async function getCommitsAheadOfMaster(commit) {
  try {
    const { stdout } = await exec(`git log --format=oneline master..${commit}`);
    return stdout.trim(0)
      .split('\n')
      .filter(line => line.length !== 0)
      .map((commitLine) => {
        const spaceIndex = commitLine.indexOf(' ');
        const id = commitLine.slice(0, spaceIndex);
        const message = commitLine.slice(spaceIndex).trim();
        return { id, message };
      });
  } catch (e) {
    console.log(`Unknown commit or branch identifer '${commit}`);
    return [];
  }
}

async function getCurrentBranch() {
  const { stdout } = await exec('git branch --no-color');
  const branches = stdout.trim().split('\n');

  // current branch is the only line that begins with *
  return branches.find(branch => branch.startsWith('*')).split(/\s+/)[1];
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

module.exports = {
  checkCommit, normalizeCommitish, getCommitsAheadOfMaster, getCurrentBranch,
};

