// @ts-check

/** @param {import('github-script').AsyncFunctionArguments} AsyncFunctionArguments */
module.exports = async ({ github, context, core }) => {
  const { repo, owner } = context.repo;
  const payload = /** @type {import('@octokit/webhooks-types').IssuesEvent} */ (context.payload);
  const { issue: { number: issue_number } } = payload
  const logParams = { title: "Add unblocked comment" };
  
  let blockedIssueNumbers = new Set();

  async function getBlockedIssueNumbers() {
    try {
      const response = await github.request(
        "GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocking",
        {
          owner,
          repo,
          issue_number: issue_number,
        }
      );

      const blockedIssues = response.data;

      if (blockedIssues.length === 0) {
        core.notice(
          `Issue #${issue_number} has no blocked issue relationships.`,
          logParams
        );
        return;
      }

      blockedIssueNumbers = new Set(blockedIssues.map(/** @param {{ number: Number }} issue */ (issue) => issue.number).filter(Boolean));
      
    } catch (error) {
      console.error(error);
    }
  }

  await getBlockedIssueNumbers();

  for (const blockedIssueNumber of blockedIssueNumbers) {
    const issueProps = {owner, repo, issue_number: blockedIssueNumber};
    let blockingIssues = []

    try {
      const response = await github.request(
        "GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by",
        {
          ...issueProps,
        }
      );

      blockingIssues = response.data;
    } catch (error) {
      console.error(error);
      continue;
    }
    
    const unblocked = blockingIssues.every(/** @param {{ state: string }} issue */ (issue) => issue.state === "closed");

    if (unblocked) {
      try {
        await github.rest.issues.createComment({
          ...issueProps,
          body: `All blocking issues have been closed this issue is ready for reevaluation.\n\ncc @ditwanp`,
        });
        core.notice(`Commented on issue #${blockedIssueNumber}.`, logParams);
      } catch (error) {
        console.error(error);
      }

      try {
        await github.rest.issues.removeLabel({
          ...issueProps,
          name: "blocked",
        });
        core.notice(`Removed blocked label from issue #${blockedIssueNumber}.`, logParams);
      } catch (error) {
        console.error(error);
      }
    } else {
      core.notice(`Issue #${blockedIssueNumber} is still blocked by open issues.`, logParams);
    }
  }
};
