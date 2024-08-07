// @ts-check
// When a blocking issue is closed:
// 1. Leaves a comment on all the issues listed as blocked in body,

module.exports = async ({ github, context }) => {
  const { ISSUE_VERIFIERS } = process.env;
  const issueBody = context.payload.issue.body;
  const blockedIssuesRegex = /(?!Blocked issues:\s)(#\d+)/gi;

  if (!issueBody) {
    console.log("No issue body was found");
    return;
  }

  // Get the list of issues blocked by this issue if there are any
  const blockedIssues = issueBody
    .match(blockedIssuesRegex)
    .map((number) => number.slice(1));

  // Add a "@" character to notify the user
  const verifiers = ISSUE_VERIFIERS.split(",").map((v) => `@${v.trim()}`);

  // If "Blocked issues" line is matched in the body then create a comment on each issue listed
  if (blockedIssues) {
    for (const issueNumber of blockedIssues) {
      const issueProps = {
        issue_number: issueNumber,
        owner: context.repo.owner,
        repo: context.repo.repo,
      };

      await github.rest.issues.createComment({
        ...issueProps,
        body: `Issue #${context.issue.number} has been closed, this issue is ready for re-evaluation. cc ${verifiers}`,
      });

      try {
        await github.rest.issues.removeLabel({
          ...issueProps,
          name: "blocked",
        });
      } catch (error) {
        if (error.status === 404) {
          console.log(
            `The label "blocked" does not exist on issue #${issueNumber}.`
          );
        } else {
          throw error;
        }
      }
    }
  } else {
    console.log(
      `No blocked issues listed in the body of issue #${context.payload.issue.number}.`
    );
  }
};
