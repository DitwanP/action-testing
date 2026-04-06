// @ts-check

/** @param {import('github-script').AsyncFunctionArguments} AsyncFunctionArguments */
module.exports = async ({ github, context, core }) => {
  const { repo, owner } = context.repo;
  const payload = /** @type {import('@octokit/webhooks-types').IssuesEvent} */ (context.payload);
  const { issue: { number: issue_number } } = payload
  const issueProps = {owner, repo, issue_number: issue_number};
  const logParams = { title: "Add unblocked comment" };
  
  let blockedIssueNumbers = new Set();

  async function getBlockedIssueNumbers() {
    try {
      const response = await github.request(
        "GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocking", issueProps
      );

      const blockedIssues = response.data;

      if (blockedIssues.length === 0) {
        core.notice(`Issue #${issue_number} has no blocked issue relationships.`, logParams);
        return;
      }

      blockedIssueNumbers = new Set(blockedIssues.map(/** @param {{ number: Number }} issue */ (issue) => issue.number).filter(Boolean));
      
    } catch (error) {
      core.error(`${error}`);
    }
  }

  await getBlockedIssueNumbers();

  for (const blockedIssueNumber of blockedIssueNumbers) {
    let blockingIssues = []

    try {
      const response = await github.request(
        "GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by",
        {
          ...issueProps,
          issue_number: blockedIssueNumber,
        }
      );
      blockingIssues = response.data;
    } catch (error) {
      core.error(`${error}`);
      continue;
    }
    
    const unblocked = blockingIssues.every(/** @param {{ state: string }} issue */ (issue) => issue.state === "closed");

    if (unblocked) {
      try {
        await github.rest.issues.createComment({
          ...issueProps,
          issue_number: blockedIssueNumber,
          body: `All blocking issues have been closed this issue is ready for reevaluation.\n\ncc @ditwanp`,
        });
        core.notice(`Added comment to issue #${blockedIssueNumber}`, logParams);
      } catch (error) {
        core.error(`${error}`);
      }

      try {
        await github.rest.issues.removeLabel({
          ...issueProps,
          issue_number: blockedIssueNumber,
          name: "blocked",
        });
        core.notice(`Removed blocked label from issue #${blockedIssueNumber}.`, logParams);
      } catch (error) {
        if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
          core.notice(`Issue #${blockedIssueNumber} does not have a blocked label, skipping label removal.`, logParams);
        } else {
          core.error(`${error}`);
        }
      }
    } else {
      core.notice(`Issue #${blockedIssueNumber} is still blocked by open issues.`, logParams);
    }
  }
};
