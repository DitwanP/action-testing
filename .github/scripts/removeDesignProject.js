// @ts-check
// const { removeDesignProject } = require("./support/utils");

/** @param {import('github-script').AsyncFunctionArguments} AsyncFunctionArguments */
module.exports = async ({ github, context }) => {
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

    // Log the issue information
    console.log("Issue Title: ", issueInfo.title);
    console.log("Issue Number: ", issueInfo.number);
    console.log("Issue Body: ", issueInfo.body);
    console.log("Issue State: ", issueInfo.state);
    console.log("Issue URL: ", issueInfo.html_url);
    console.log("All Issue Info:", issueInfo);

  } catch (error) {
    console.error(`Error fetching issue information: ${error.message}`);
    process.exit(1);
  }
};
