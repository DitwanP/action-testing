// @ts-check
const {
  labels: { planning },
} = require("./support/resources");

/** @param {import('github-script').AsyncFunctionArguments} AsyncFunctionArguments */
module.exports = async ({ github, context }) => {
  const { repo, owner } = context.repo;
  const payload = /** @type {import('@octokit/webhooks-types').IssuesLabeledEvent} */ (context.payload);
  const {
    label,
    issue: { number },
  } = payload;

  const issueBody = payload.issue.body;
  const ommitComment = `\n\nBEGIN_COMMIT_OVERRIDE\nEND_COMMIT_OVERRIDE`

  if (!issueBody) {
    console.log("No issue body was found");
    return;
  }

   if (label?.name === planning.noChangelogEntry) {
    const issueProps = {
      owner,
      repo,
      issue_number: number,
    };

    const newIssueBody = issueBody + ommitComment;

    await github.rest.issues.update({
      ...issueProps,
      body: newIssueBody,
    });
  }
};
