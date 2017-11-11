# lfs-check

<!-- cSpell:ignore repo, markdownlint, cword, esac, numstat, gitcomp -->
[![Build Status](https://travis-ci.org/michaelgwelch/lfs-check.svg?branch=master)](https://travis-ci.org/michaelgwelch/lfs-check)

Make sure your binary files are not accidentally added to your git repository.

Run this command line utility to identify any binary files that were added to
your current branch. It will examine every new commit in the current branch
since `master`. (It assumes everything in master is clean or else
it's too late to do anything about it.)

Note: If the current branch is not ahead of master this check will not do anything.

## Install

```sh
npm install -g lfs-check
```

## TeamCity Usage

Invoke the command with teamcity reporter

```sh
lfs-check --reporter=teamcity
```

If you wish for the program to identify inspection errors but not actually fail the build, you can
pass the `--no-build-problem` switch:

```sh
lfs-check --no-build-problem --reporter=teamcity
```

### Additional TeamCity Requirements

If TeamCity doesn't fetch the master branch this command will fail. I've added an explicit TeamCity Command Line build step to ensure that master has been fetched.

```sh
git fetch origin master
```

Then I invoke `lfs-check` with explicit commits:

```sh
lfs-check HEAD origin/master --reporter=teamcity
```

### Node Projects

You may wish to add two tasks to your package.json scripts section:

```json
"scripts": {
  "lfs-check": "node node_modules/lfs-check",
  "lfs-check:teamcity": "node node_modules/lfs-check HEAD origin/master --reporter=teamcity"
}
```

And then from your team city build you can add a build step to run `lfs-check:teamcity` and from the command line you can invoke the check by typing `npm run lfs-check`.

Note the usage of explicit commits in the teamcity build step. See [Additional TeamCity Requirements](#additional-teamcity-requirements) above.

## Command line usage

```sh
usage : lfs-check [branch]
        git lfs-check [branch]
```

Identifies binary files and associated commits that have been added since `master`. If no branch name
is specified then the current branch is used. The command examines every commit ahead of master reporting
on any binaries that were found.

**Note:** This command does nothing if you run it from the master branch without specifying another branch.
This is because there is no diff produced when comparing master against master. If you run this command
from master be sure to specify which branch you are examining.

To understand this behavior, it helps to know that the motivation for this program was to look for binary
files in a pull request. In that scenario there is no need to examine master. Even if it contains
binaries, in most cases it's too late to do anything about it unless your repository is new and you don't
mind rewriting history.

In the following example, the branch
`my-feature-branch` is 2 commits ahead of master. So those two commits are checked.

```sh
$ git checkout my-feature-branch
$ lfs-check
436e789 update readme
53bb1bb add feature
```

In the following example I added binaries to my feature branch. Even though you can tell from my commit
history that I later removed them, `lfs-check` still finds them in the earlier commit and warns me.

```sh
$ lfs-check play-with-binaries
abcdef remove binary files from repo
d63b9f add binary files to repo
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

Now you can type \<TAB\> after `lfs-` to auto-complete. This also works to auto-complete branch and tag names like
other git commands.

**Note:** I have no idea how to write bash completions. The one above is based on `__git_branch ()` completions. I
copied that function and removed a section I know I didn't need dealing with branch switches.
It seems to work for my needs (completing branch names).

<!-- markdownlint-enable no-hard-tabs -->

## Manually inspecting your entire branch

If you wish to check the entire history in a branch you can use the following command upon which
this utility is based on.

```sh
git log --numstat | awk '/^-/{print $NF}' | sort -u
```

You can read more about `git log` and/or read the answers at this [Stack Overflow Question](https://stackoverflow.com/questions/27931520/git-find-all-binary-files-in-history)
