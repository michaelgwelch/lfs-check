# lfs-check

Make sure your binary files are tracked using `git lfs` and not entered directly into your repo.

Run this as a command line utility to identify any binary files that were added to your repository, or use it as a library to incorporate it into your own scripts.

## Command line usage

Install

```sh
npm install -g lfs-check
```

In this commit everything is ok. No files are listed, this means no binary files were added in this commit.

```sh
$ lfs-check HEAD
Checking commit 1d6f38
```

In the following commit I accidentally committed binaries to my repo. I may want to consider tracking them using `git-lfs` and then rebase (or otherwise rewrite history) to avoid having a binary permanently added to a published repo.

```sh
$ lfs-check play-with-binaries^^
Checking commit d63b9f
Binary files found:
  bin/Schedule.xlsx
  bin/integration.png
```

## Library Usage

This package is useful as a command line tool for double checking your work before pushing it. However, it is primarily intended to be used as part of a build process to check for any binaries in a pull request.

There is one main function that is exposed `checkCommit`:

```js
/**
 * Checks the changed files in the specified commit and returns an array of
 * binary files that are checked into the repository from that commit. The files are identified in the
 * format 'commit:path'.
 * @param {Commit|string} [commit = 'HEAD'] commit - A commit identifier
 * @returns {Promise.<Array.<string>>} A promise that resolves to a list of file paths. These paths
 * represent the binary files included in this commit.
 * The path is in the format commit:path (eg. d7abc6:bin/image.png). This commit prefix is used
 * to make it explicit that the results for that file pertain to that commit.
 */
async function checkCommit(commit = 'HEAD')
```

It can be used like in the following simple example that checks HEAD.

```js
const lfs = require('lfs-check');

async function checkHead() {
  const errors = await lfs.checkCommit('HEAD');
  console.log(errors);
}
```