# Publish this project to a new empty Git remote

Use this when you have a **new empty repository** (e.g. GitHub) and want the same code there.

## Prerequisites

- You have push access to the new repository URL (`https` or `ssh`).
- Local changes are committed (`git status` should be clean before you push).

## Option A — Keep full history (recommended)

From the repository root:

```bash
git remote add neworigin https://github.com/YOU/NEW-REPO.git
git push -u neworigin main
```

If `neworigin` already exists, remove it first: `git remote remove neworigin`.

To make the new remote the default `origin` later:

```bash
git remote rename origin oldorigin
git remote rename neworigin origin
git push -u origin main
```

## Option B — Single squashed commit on the new remote

```bash
git checkout --orphan fresh-main
git add -A
git commit -m "Initial import: tracking studio"
git remote add neworigin https://github.com/YOU/NEW-REPO.git
git push -u neworigin fresh-main:main
```

Then reset your local default branch as needed (or clone fresh from the new repo).

## Helper script

From the repo root:

```bash
chmod +x scripts/push-new-origin.sh
./scripts/push-new-origin.sh https://github.com/YOU/NEW-REPO.git
```

This adds remote `neworigin` (if missing) and pushes `main`.

## After the first push

Clone on another machine and verify:

```bash
git clone https://github.com/YOU/NEW-REPO.git
cd NEW-REPO
npm install
npm run dev
```

## Non-empty remote (e.g. only README/LICENSE)

You may need to merge unrelated histories once, or coordinate with the host’s default branch. Prefer an **empty** repo for a clean first push.
