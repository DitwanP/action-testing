// @ts-check

/** @param {import('github-script').AsyncFunctionArguments} AsyncFunctionArguments */
module.exports = async ({ github, context }) => {
  const { repo, owner } = context.repo;
  const payload = context.payload;

  if (!payload.issue || !payload.issue.number) {
    console.log("No issue was found in the payload.");
    return;
  }

  if (payload.action !== "closed" && payload.issue.state !== "closed") {
    console.log(
      `Skipping because issue #${payload.issue.number} is not closed (action=${payload.action}).`
    );
    return;
  }

  const issueNumber = payload.issue.number;
  const blockedIssueNumbers = new Set();

  async function getBlockedIssueNumbers() {
    try {
      const response = await github.request(
        "GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocking",
        {
          owner,
          repo,
          issue_number: issueNumber,
        }
      );

      const blockedIssues = response.data || [];

      for (const issue of blockedIssues) {
        if (issue.number) {
          blockedIssueNumbers.add(issue.number);
        }
      }
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? error.message
          : String(error);
      console.log(
        "Could not fetch blocking issue relationships using REST API:",
        message
      );
    }
  }

  await getBlockedIssueNumbers();

  if (blockedIssueNumbers.size === 0) {
    console.log(
      `Issue #${issueNumber} appears to have no blocked issue relationships.`
    );
    return;
  }

  for (const blockedIssueNumber of blockedIssueNumbers) {
    const issueProps = {
      owner,
      repo,
      issue_number: blockedIssueNumber,
    };

    try {
      await github.rest.issues.createComment({
        ...issueProps,
        body: `Issue #${issueNumber} has been closed and is no longer blocking this issue.\n\ncc @ditwanp for re-evaluation.`,
      });
      console.log(`Commented on issue #${blockedIssueNumber}.`);
    } catch (error) {
      if (error && typeof error === "object" && "status" in error && error.status === 404) {
        console.log(`Issue #${blockedIssueNumber} was not found.`);
      } else {
        throw error;
      }
    }

    try {
      await github.rest.issues.removeLabel({
        ...issueProps,
        name: "blocked",
      });
      console.log(`Removed blocked label from issue #${blockedIssueNumber}.`);
    } catch (error) {
      if (error && typeof error === "object" && "status" in error && error.status === 404) {
        console.log(
          `The blocked label is not present on issue #${blockedIssueNumber}.`
        );
      } else {
        throw error;
      }
    }
  }
};
