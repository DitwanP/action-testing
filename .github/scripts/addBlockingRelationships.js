// @ts-check
// When a blocking issue is closed:
// 1. Uses the REST API to find issues blocked by this issue.
// 2. Leaves a comment on each dependent issue and removes the "blocked" label IF there's no other blocked by relationships.

/** @param {import('github-script').AsyncFunctionArguments} AsyncFunctionArguments */
module.exports = async ({ github, context }) => {
  const { repo, owner } = context.repo;
  const payload = context.payload;

  if (!payload.issue || !payload.issue.number) {
    console.log("No issue was found in the payload.");
    return;
  }

  const issueNumber = payload.issue.number;
  const issueId = payload.issue.id;
  const issueBody = payload.issue?.body || "";
  
  const blockedIssuesLineRegex = /Blocked issues:\s*([^\n]+)/i;
  const issueRegex = /#(\d+)|https:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/(\d+)/g;
  const blockedIssueNumbers = new Set();

  const blockedIssuesLineMatch = issueBody.match(blockedIssuesLineRegex);
  if (!blockedIssuesLineMatch) {
    return;
  }

  const blockedLine = blockedIssuesLineMatch[1];
  let match;
  while ((match = issueRegex.exec(blockedLine)) !== null) {
    const matchedIssueNumber = Number(match[1] || match[2]);
    if (matchedIssueNumber && matchedIssueNumber !== issueNumber) {
      blockedIssueNumbers.add(matchedIssueNumber);
    }
  }

  async function addRelationshipsToBlockedIssues() {
    for (const blockedIssueNumber of blockedIssueNumbers) {
      try {
        console.log(`Marking issue #${issueNumber} as blocking issue #${blockedIssueNumber}...`);
        await github.request(
          "POST /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by",
          {
            owner,
            repo,
            issue_number: blockedIssueNumber,
            issue_id: issueId,
          }
        );

      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? error.message
            : String(error);
        console.log(
          "Could not add blocking issue relationships using REST API:",
          message
        );
      }
    }
  }

  // await getBlockedIssueIds();
  await addRelationshipsToBlockedIssues();

  console.log("Finished adding blocked relationships.");
};
