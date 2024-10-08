// @ts-check
const { createLabelIfMissing } = require("./support/utils");

/** @param {import('github-script').AsyncFunctionArguments} AsyncFunctionArguments */
module.exports = async ({ github, context }) => {
  const { repo, owner } = context.repo;

  const payload = /** @type {import('@octokit/webhooks-types').IssuesEvent} */ (context.payload);
  const {
    issue: { body, number: issue_number },
  } = payload;

  if (!body) {
    console.log("could not determine the issue body");
    return;
  }

  // NOTE: assumes all packages will be in the @esri NPM scope
  const packageRegex = /(?<=\[X\]\s@esri\/)[\w-]*$/gm;
  const packages = body.match(packageRegex) || [];

  // If issue includes "Calcite package" line then add package, otherwise log message.
  if (packages.length !== 0){
    for (const package of packages) {
      await createLabelIfMissing({
        github,
        context,
        label: package,
        color: "BFBEAF",
        description: `Issues specific to the @esri/${package} package.`,
      });
  
      await github.rest.issues.addLabels({
        issue_number,
        owner,
        repo,
        labels: [package],
      });
    }
  } else {
    console.log(`No Calcite package listed on issue ${issue_number}`)
  }
};
