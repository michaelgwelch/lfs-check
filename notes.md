# Notes

- [Files Changed by a Commit](#files-changed-by-a-commit)
- [Files Changed by Merge Commit](#files-changed-by-merge-commit)
- [Identify a Merge Commit](#identify-a-merge-commit)
- [Find Hash of File From Commit and Path](#find-hash-of-file-from-commit-and-path)
- [To Check An Attribute on a File](#to-check-an-attribute-on-a-file)
- [Determinig if Git Thinks a File is Binary](#determinig-if-git-thinks-a-file-is-binary)
- [Format of a Commit Object](#format-of-a-commit-object)
- [The Empty Tree Hash](#the-empty-tree-hash)

Useful git commands

## Files Changed by a Commit

```sh
git diff --name-only <commit1> <commit2>
    This format identifies the changes between commit1 and commit2

git diff --name-only commit^
    This format identifies the changes introduced by the commit
```

For example,

```sh
$ git diff --name-only HEAD^
.gitattributes
scripts/git.js
scripts/lfs-finder.js
scripts/sequence.js
```

> **Note:** The second version can be misleading when the commit in question is a merge commit.
> A merge commit has more than one parent and therefore to identify just the files that were changed by a merge you need to do a comparison that involves the commit and all of its parents. This command does no do that.
See [Files Changed by Merge Commit](#files-changed-by-merge-commit)

## Files Changed by Merge Commit

```sh
git diff-tree --cc --name-only <merge commit>
```

In the following example we see that a merge commit only introduced changes to the `.markdownlint.json` file.

```sh
$ git diff-tree --cc --name-only 79685181346db40abda1543da53fc6257a0ad4d9
79685181346db40abda1543da53fc6257a0ad4d9
.markdownlint.json
```

Contrast this with the result when we compare the commit to either of its parents individually. To explicitly choose parent one use `^1` after the commit.

Partial list of files that have changed since parent1:

```sh
git diff --name-only 79685181346db40abda1543da53fc6257a0ad4d9^1
.gitattributes
.markdownlint.json
bin/Scheduler.comparison.xlsx
package-lock.json
package.json
```

Partial list of files that have changed since parent2:

```sh
$ git diff --name-only 79685181346db40abda1543da53fc6257a0ad4d9^2
.gitattributes
.markdownlint.json
README.md
bin/Scheduler.comparison.xlsx
package-lock.json
package.json
releases/alderaan/api/api-documentation.md
releases/alderaan/api/api-hld.md
```

So you can see that the changes introduced by the merge itself can be signficantly different that the changes since either parent. In this case the merge commit only modified one file.

## Identify a Merge Commit

```sh
git cat-file -p <commit>
```

And look for more than one `parent` line. If there are more than one `parent` lines, the commit is a merge commit.

For example:

```bash
$ git cat-file -p 79685181346db40abda1543da53fc6257a0ad4d9^
tree 8b4d37d7056c0df225955a46442c97aa59c9f5e6
parent b87ca618eb4908502b14f5f296942a6dcb82b26f
parent 20346d20fc764cffa3a38e3bbe7fe796ed29da2c
author Michael Welch <michael.g.welch@jci.com> 1509041243 -0500
committer Michael Welch <michael.g.welch@jci.com> 1509041243 -0500
```

## Find Hash of File From Commit and Path

```sh
git rev-parse commit:path/to/file
```

Example:

```sh
$ git rev-parse 2648f217f49b0476abf26fb786e89e8b47d0cf98:scripts/md-lint.js
1746453e89c32d7e92d2d5eab2b181c631c514c0
```

If the commit doesn't exist, an error is reported: Note that the original parameters are returned on the first line.
This can be used to detect an error.

```sh
$  git rev-parse 2648f217f49b0476abf26fb786e89e8b47d0cf97:scripts/md-lint.js
2648f217f49b0476abf26fb786e89e8b47d0cf97:scripts/md-lint.js
fatal: Path 'scripts/md-lint.js' exists on disk, but not in '2648f217f49b0476abf26fb786e89e8b47d0cf97'.
```

If the file doesn't exist, an error is reported. Note that the original parameters are returned on the first line.
This can be used to detect an error.

```sh
$ git rev-parse 2648f217f49b0476abf26fb786e89e8b47d0cf98:scripts/md-lint.j
2648f217f49b0476abf26fb786e89e8b47d0cf98:scripts/md-lint.j
fatal: Path 'scripts/md-lint.j' does not exist in '2648f217f49b0476abf26fb786e89e8b47d0cf98'
```

## To Check An Attribute on a File

```sh
git check-attr attr path
```

Example: To check to see if a file is considered `text` based on git attributes:

```sh
$ git check-attr text scripts/notes.md
scripts/notes.md: text: set
```

## Determinig if Git Thinks a File is Binary

See https://stackoverflow.com/questions/6119956/how-to-determine-if-git-handles-a-file-as-binary-or-as-text

This can be used in the following way

Note: Check a file that was NOT lfs and then becomes lfs. Need to still detect that.

A binary file in a commit is detected with the key phrase 'Binary files differ'

```sh
$ git diff-tree -p 4b825dc642cb6eb9a060e54bf8d69288fbee4904 refactor-scripts-wip -- bin/Scheduler.comparison.xlsx
diff --git a/bin/Scheduler.comparison.xlsx b/bin/Scheduler.comparison.xlsx
new file mode 100644
index 0000000..14d5f0e
Binary files /dev/null and b/bin/Scheduler.comparison.xlsx differ
```

A binary file checked in as git lfs does not have that error and it spits out the difference, so we see
the actual lfs pointer file.

```sh
$ git diff-tree -p 4b825dc642cb6eb9a060e54bf8d69288fbee4904 refactor-scripts-wip -- images/tyco-integration.png
diff --git a/images/tyco-integration.png b/images/tyco-integration.png
new file mode 100644
index 0000000..fc2ff22
--- /dev/null
+++ b/images/tyco-integration.png
@@ -0,0 +1,3 @@
+version https://git-lfs.github.com/spec/v1
+oid sha256:076ee23e83388a443eeddd6a57810a3bfdd1c4cfbd0250eb4fdc2e1c6c2ab092
+size 223716
```

Many people seem to prefer the `--numstat` option as it includes the pattern '-\t-\t' in the results.
I think I'll do that to, but also put a test in my checker for a known binary file in my repo, to detect
if this ever changes (not a trick everyone could use uness they already had a binary file in their repo)

In the following scenario, HEAD has a corrected version of the binary so it prints out that 3 lines were added, 0 deleted.
In HEAD^ the binary wasn't tracked via lfs so it's still a binary. So we see the "-\t-\t" pattern.

<!-- markdownlint-disable no-hard-tabs  -->
<!-- Disabled because the hard tabs are part of what I'm demonstrating. -->

```sh
$ git diff-tree --numstat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD -- bin/tyco-integration
3	0	bin/tyco-integration
marathon:evolution cwelchmi$ git diff-tree --numstat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 HEAD^ -- bin/tyco-integration
-	-	bin/tyco-integration
```

<!-- markdownlint-enable no-hard-tabs -->

## Format of a Commit Object

The format of a commit object is as follows:

See `commit_tree_extended` in [commit.c](https://github.com/git/git/blob/master/commit.c) for exact details. For my purposes this is good enough. I need tree, parent(s), author and committer.

```text
tree 33833777e399f0b4018c476082eb43565f670b26
parent 9fb33a2abe4051174af6d844e61b0602f95747cd
author Michael Welch <michael.g.welch@jci.com> 1509199306 -0500
committer Michael Welch <michael.g.welch@jci.com> 1509199306 -0500

WIP on scripts
```

> **Note**: The parent line may not exist (for the first commit in a repo). Also there may be multiple parent lines (for merge commits).
    
## The Empty Tree Hash

https://stackoverflow.com/questions/9765453/is-gits-semi-secret-empty-tree-object-reliable-and-why-is-there-not-a-symbolic

> 4b825dc642cb6eb9a060e54bf8d69288fbee4904

With devices that have `/dev/null` this can be calculated with `git hash-object -t tree /dev/null`

Or if you create an empty file called `emptyfile` you can get the hash `git hash-object -t tree emptyfile`
