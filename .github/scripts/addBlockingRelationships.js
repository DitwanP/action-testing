// @ts-check
/** @param {import('github-script').AsyncFunctionArguments} AsyncFunctionArguments */
module.exports = async ({ github, context, core }) => {
  const { repo, owner } = context.repo;
  const logParams = { title: "Add Blocking Relationships" };

  const payload = /** @type {import('@octokit/webhooks-types').IssuesEvent} */ (context.payload);
  const {
    issue: { body, id, number: issue_number },
  } = payload;

  if (!payload.issue || !payload.issue.number) {
    core.notice("No issue was found in the payload.", logParams);
    return;
  }

  if (!body) {
    core.notice("Could not determine the issue body", logParams);
    return;
  }
  
  const blockedIssuesLineRegex = /Blocked issues:\s*([^\n]+)/i;
  const issueRegex = /#(\d+)|https:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/(\d+)/g;
  const blockedIssueNumbers = new Set();

  const blockedIssuesLineMatch = body.match(blockedIssuesLineRegex);
  if (!blockedIssuesLineMatch) {
    return;
  }

  const blockedLine = blockedIssuesLineMatch[1];

  let match;

  while ((match = issueRegex.exec(blockedLine)) !== null) {
    const matchedIssueNumber = Number(match[1] || match[2]);
    if (matchedIssueNumber && matchedIssueNumber !== issue_number) {
      blockedIssueNumbers.add(matchedIssueNumber);
    }
  }

  async function addRelationshipsToBlockedIssues() {
    for (const blockedIssueNumber of blockedIssueNumbers) {
      try {
        console.log(`Marking issue #${issue_number} as blocking issue #${blockedIssueNumber}...`);
        await github.request(
          "POST /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by",
          {
            owner,
            repo,
            issue_number: blockedIssueNumber,
            issue_id: id,
          }
        );

      } catch (error) {
        core.error(`${error}`, logParams);
      }
    }
  }

  await addRelationshipsToBlockedIssues();

  core.notice("Finished adding blocked relationships.", logParams);
};
