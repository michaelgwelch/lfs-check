# lfs-check

Make sure your binary files are tracked using lfs and not entered directly into your repo

## Command line usage

Install

```sh
npm install -g lfs-check
```

In this commit everything is ok:

```sh
$ lfs-check HEAD
Checking commit 1d6f38
```

In the following commit I accidentally committed binaries to my repo.

```sh
$ lfs-check play-with-binaries^^
Checking commit d63b9f
Binary files found:
  bin/Schedule.xlsx
  bin/integration.png
```

## Library Usage

This package is useful as a command line tool for double checking  your work before pushing it. However, it is primarily intended to be used as part of a build process to check for any binaries in a pull request.

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
  const errors = await lfs-checkCommit('HEAD');
  console.log(error);
}