// @ts-check
// const { removeDesignProject } = require("./support/utils");
const { exec } = require('child_process');

/** @param {import('github-script').AsyncFunctionArguments} AsyncFunctionArguments */
module.exports = async ({ github, context }) => {
  const projectNumber = 1;
  const { repo, owner } = context.repo;

  const payload = /** @type {import('@octokit/webhooks-types').IssuesEvent} */ (context.payload);
  const {
    issue: { body, number: issue_number },
  } = payload;

  // The command to run
  const command = `gh api graphql -f query="
  query($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      projectV2(number: $number) {
        id
      }
    }
  }
  Variables {
    "owner": ${owner},
    "name": ${repo},
    "number": ${projectNumber}
  }"`;

  // Run the command using exec
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing command: ${error.message}`);
      return;
    }

    if (stderr) {
      console.error(`Error in command execution: ${stderr}`);
      return;
    }

    // Process and log the result from the stdout
    console.log(`Command output:\n${stdout}`);
  });

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
    console.log("Issue number:", issueInfo.number);
    console.log("Issue title:", issueInfo.title);
    console.log("Issue node ID:", issueInfo.node_id);

  } catch (error) {
    console.error(`Error fetching issue information: ${error.message}`);
    process.exit(1);
  }
};
