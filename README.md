# lfs-check

Make sure your binary files are tracked using `git lfs` and not entered directly into your repo.

Run this as a command line utility to identify any binary files that were added to your current branch, or use it as a library to incorporate it into your own scripts.

## Command line usage

Install

```sh
npm install -g lfs-check
```

Here is the usage:

```sh
usage : lfs-check [branch]
        git lfs-check [branch]
```

The application identifies those commits that are ahead of master and checks them for binary files.
If no branch is specified, the current branch is used. If the command is run in the master branch nothing
happens.

In the following example, the branch
`my-feature-branch` is 2 commits ahead of master. So those two commits are checked.

```sh
$ git checkout my-feature-branch
$ lfs-check
Checking commit 436e789
Checking commit 53bb1bb
```

In the following example we specify an actual commit to check, the commit is ok. No files are listed, this means no binary files were added in this commit.

In the following commit I accidentally committed binaries to my repo. I may want to consider tracking them using `git-lfs` and then rebase (or otherwise rewrite history) to avoid having a binary permanently added to a published repo.

```sh
$ lfs-check play-with-binaries^^
Checking commit d63b9f
Binary files found:
  bin/Schedule.xlsx
  bin/integration.png
```

### Auto completions

You can use this like a git command and expect completions for branch and tag names. Add the following to your
`.git-completion.bash` script (I placed it right under `__git_branch ()`):

<!-- markdownlint-disable no-hard-tabs -->

```bash
_git_lfs_check ()
{
	local i c=1 only_local_ref="n" has_r="n"

	while [ $c -lt $cword ]; do
		i="${words[c]}"
		case "$i" in
		-d|--delete|-m|--move)	only_local_ref="y" ;;
		-r|--remotes)		has_r="y" ;;
		esac
		((c++))
	done

	case "$cur" in
	--set-upstream-to=*)
		__git_complete_refs --cur="${cur##--set-upstream-to=}"
		;;
	# --*)
	# 	__gitcomp "
	# 		--color --no-color --verbose --abbrev= --no-abbrev
	# 		--track --no-track --contains --no-contains --merged --no-merged
	# 		--set-upstream-to= --edit-description --list
	# 		--unset-upstream --delete --move --remotes
	# 		--column --no-column --sort= --points-at
	# 		"
	# 	;;
	*)
		if [ $only_local_ref = "y" -a $has_r = "n" ]; then
			__gitcomp_direct "$(__git_heads "" "$cur" " ")"
		else
			__git_complete_refs
		fi
		;;
	esac
}
```

With this in place you can type

```sh
git lfs-check branch-name
```

So can type \<TAB\> after `lfs-` to auto-complete and also the first few characters of branch name to auto complete.


<!-- markdownlint-enable no-hard-tabs -->

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