// @ts-check
const {
  labels: { planning },
} = require("./support/resources");

/** @param {import('github-script').AsyncFunctionArguments} AsyncFunctionArguments */
module.exports = async ({ github, context }) => {
  const { repo, owner } = context.repo;
  const payload = /** @type {import('@octokit/webhooks-types').IssuesEvent} */ (context.payload);
  const {
    issue: { body, number: issue_number },
  } = payload;

  const DAYS_BEFORE_CLOSE = 14; // 2 weeks

  try {
    console.log(`Checking for issues with the label: "${planning.needsInfo}" that are stale.`);

    // Get all issues with the specific label
    const { data: issues } = await github.rest.issues.listForRepo({
      owner: owner,
      repo: repo,
      state: "open",
      labels: planning.needsInfo,
      per_page: 100,
    });

    //remove this later
    console.log(`Issues with the label "${planning.needsInfo}":`, issues);

    const now = new Date();

    for (const issue of issues) {
      const lastUpdated = new Date(issue.updated_at);
      const daysSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

      //remove this later
      console.log(`Days since update: ${daysSinceUpdate}`);

      if (daysSinceUpdate >= DAYS_BEFORE_CLOSE) {
        console.log(`Closing issue #${issue.number} - No updates for ${daysSinceUpdate.toFixed(1)} days`);

        await github.rest.issues.update({
          issue_number: issue.number,
          owner: owner,
          repo: repo,
          state: "closed",
        });

        await github.rest.issues.createComment({
          owner: owner,
          repo: repo,
          issue_number: issue.number,
          body: "Closing this issue due to inactivity. If this is still an issue, it can be reopened once additional information has been provided.",
        });
      }
    }

    console.log("Finished checking for issues without enough information.");
  } catch (error) {
    console.error("Error closing issues with  issues:", error);
  }
};
