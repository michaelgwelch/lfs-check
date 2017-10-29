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

This package, while useful as a command line tool for double checking before your work before pushing your work, is intended to be used as part of a build process to check for any binaries in a pull request.

There is only one function that will be exposed `checkCommit`:

```js
/**
 * Checks the changed files in the specified commit and returns an array of
 * binary files that are checked into the repository. The files are identified in the 
 * format 'commit:path'.
 * @param {Commit|string} [commit = 'HEAD'] commit - A commit identifier
 * @returns {Array.<string>} A list of binary files. Each file is identified by commit
 * and path in the format commit:path (eg. d7abc6:bin/image.png)
 */
async function checkCommit(commit = 'HEAD')
```

At the time of writing, it is not yet exposed. It will work someting like this

```js
const lfs = require('lfs-check');

async function checkHead() {
  const errors = await lfs-checkCommit('HEAD');
  console.log(error);
}