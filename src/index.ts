import * as cp from "child_process";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { isAdvisory, getAuditResults } from "./yarn";

async function exec(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(cmd, args);
    const proc = cp.spawn(cmd, args, {
      env: process.env
    });
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    proc.on("error", err => {
      reject(err);
    });
    proc.on("close", code => {
      code === 0
        ? resolve()
        : reject(new Error(`child process exited on ${code}`));
    });
  });
}

async function checkDiff(): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    cp.exec("git diff --exit-code")
      .on("close", code => resolve(code === 1))
      .on("error", reject)
  })
}

async function commitAndPush({
  branch,
  message,
  owner,
  token,
  repo,
  user,
  email
}: {
  branch: string;
  message: string;
  owner: string;
  token: string;
  repo: string;
  user: string;
  email: string;
}) {
  await exec("git", ["config", "--local", "user.email", email]);
  await exec("git", ["config", "--local", "user.name", user]);
  await exec("git", ["checkout", "-b", branch]);
  await exec("git", ["add", "yarn.lock"]);
  await exec("git", ["commit", "-m", message]);
  const origin = `https://${owner}:${token}@github.com/${owner}/${repo}.git`;
  await exec("git", ["remote", "set-url", "origin", origin]);
  await exec("git", ["push", "origin", branch]);
}

async function main({
  owner,
  repo,
  token,
  user,
  email
}: {
  owner: string;
  repo: string;
  token: string;
  user: string;
  email: string;
}) {
  const results = await getAuditResults(process.cwd());
  const packages = new Set<string>();
  let vulCnt = 0;
  for (const item of results) {
    if (isAdvisory(item)) {
      vulCnt++;
      const [pkg] = item.data.resolution.path.split(">");
      packages.add(pkg);
    }
  }
  if (packages.size === 0) {
    console.log("No vulnerabilities found");
  } else {
    console.log(`${vulCnt} vulnerabilities found in ${packages.size} packages`);
    await exec("yarn", ["upgrade", ...packages.values()]);
    const now = new Date();
    const [yyyy, MM, dd] = [
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    ];
    const branch = `audit-${yyyy}${MM}${dd}`;
    const title = `audit: ${[...packages.values()].join(" ")}`;
    const hasDiff = await checkDiff();
    if (!hasDiff) {
      core.warning(`Audit succeeded but packages hasn't been upgraded`)
      return
    }
    await commitAndPush({
      branch,
      owner,
      repo,
      token,
      user,
      email,
      message: title
    });
    const octkit = new github.GitHub(token);
    // @ts-ignore
    const resp = await octkit.pulls.create({
      owner,
      repo,
      title,
      head: branch,
      base: "master"
    });
    console.log(`PR created on ${resp.data.url}`);
  }
}

if (require.main === module) {
  const repository = core.getInput("github-repository");
  const token = core.getInput("github-token");
  const user = core.getInput("git-user");
  const email = core.getInput("git-email");
  const [owner, repo] = repository.split("/");
  if (!token) {
    throw new Error("github-token is required");
  }
  main({ owner, repo, token, user, email })
    .then(() => {
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
