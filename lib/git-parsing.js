function parseGitBranch(output) {
  const branches = output.trim().split('\n');

  // current branch is the only line that begins with *
  return branches.find(branch => branch.startsWith('*')).split(/\s+/)[1];
}

module.exports = { parseGitBranch };
