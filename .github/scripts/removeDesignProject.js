// @ts-check
// const { removeDesignProject } = require("./support/utils");

/** @param {import('github-script').AsyncFunctionArguments} AsyncFunctionArguments */
module.exports = async ({ github, context }) => {
  const project_id = 1
  const { repo, owner } = context.repo;

  const payload = /** @type {import('@octokit/webhooks-types').IssuesEvent} */ (context.payload);
  const {
    issue: { body, number: issue_number },
  } = payload;

  try {
    const { data: issueInfo } = await github.rest.issues.get({
      owner,
      repo,
      issue_number,
      headers: {
        'Accept': 'application/vnd.github.raw+json'
      }
    });

    const testProject = await github.rest.projects.get({
      project_id,
    });

    // Log the issue information
    console.log("All Issue Info:", issueInfo);
    console.log("Project Info", testProject);

  } catch (error) {
    console.error(`Error fetching issue information: ${error.message}`);
    process.exit(1);
  }
};
