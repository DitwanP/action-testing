// @ts-check
/** @param {import('github-script').AsyncFunctionArguments} AsyncFunctionArguments */
module.exports = async ({ github, context, core }) => {
  const { repo, owner } = context.repo;
  // const logParams = { title: "Add Blocking Relationships" };

  const payload = /** @type {import('@octokit/webhooks-types').IssuesEvent} */ (context.payload);
  const {issue: { body, id, number: issue_number }} = payload;
  const issueProps = {owner, repo, issue_number: issue_number};

  if (!payload.issue || !payload.issue.number) {
    console.log("No issue was found in the payload.");
    return;
  }

  if (!body) {
    console.log("Could not determine the issue body");
    return;
  }
  
  const blockedIssuesLineRegex = /Blocked issues:\s*([^\n]+)/i;
  const issueRegex = /#(\d+)|https:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/(\d+)/g;
  const blockedIssuesLineMatch = body.match(blockedIssuesLineRegex);
  const blockedIssueNumbers = new Set();
  
  if (!blockedIssuesLineMatch) {
    console.log("No blocked issues line found in the issue description.");
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
            ...issueProps,
            issue_number: blockedIssueNumber,
            issue_id: id,
          }
        );
      } catch (error) {
        console.error(error);
      }
    }
  }

  async function removeBlockedIssuesLineFromIssueDescription() {
    const blockedIssuesLineRegexForReplacement = /Blocked issues:\s*([^\n]+)\n?/i;
    const newBody = body?.replace(blockedIssuesLineRegexForReplacement, "").trim();

    try {
      await github.request(
        "PATCH /repos/{owner}/{repo}/issues/{issue_number}",
        {
          ...issueProps,
          body: newBody,
        }
      );
      console.log("Removed blocked issues line from issue description.");
    } catch (error) {
      console.error(error);
    }

    try {
      await github.rest.issues.createComment({
        ...issueProps,
        body: `All blocked issues from description have been added as relationships and removed from the description.\n\ncc @ditwanp`,
      });
    } catch (error) {
      console.error(error);
    }
  }

  await addRelationshipsToBlockedIssues().then(async () => {
    await removeBlockedIssuesLineFromIssueDescription();
  });

  console.log("Finished adding blocked relationships.");
};
