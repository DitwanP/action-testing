
const { execSync } = require('child_process');

// Environment variables from the GitHub Action
const owner = process.env.OWNER;
const repo = process.env.REPO;
const issueNumber = process.env.ISSUE_NUMBER;
const labelName = process.env.LABEL_NAME;
const token = process.env.GITHUB_TOKEN;

// Function to execute a GitHub GraphQL command
function runQuery(query) {
  return execSync(`gh api graphql -f query='${query}'`, { encoding: 'utf-8' });
}

try {
  // GraphQL query to find the project associated with the issue
  const query = `
    query($owner: String!, $repo: String!, $issueNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $issueNumber) {
          projectItems(first: 1) {
            nodes {
              id
              project {
                id
                title
                url
              }
            }
          }
        }
      }
    }
    variables {
      "owner": ${owner},
      "repo": ${repo},
      "issueNumber": ${issueNumber}
    }
  `;

  const result = runQuery(query);
  const parsedResult = JSON.parse(result);
  const projectItem = parsedResult.data.repository.issue.projectItems.nodes[0];

  console.log(`Query results: ${reult} `)
  console.log(`Project: ${projectItem} `)

  if (projectItem) {
    console.log(`Issue is in project: ${projectItem.project.title} (URL: ${projectItem.project.url})`);

    if (labelName === "Archive") {
      const archiveQuery = `mutation { archiveProjectV2Item(input: {projectId: "${projectItem.project.id}", itemId: "${projectItem.id}"}) { clientMutationId } }`;
      runQuery(archiveQuery);
      console.log("Issue archived in project.");
    } else if (labelName === "Remove") {
      const deleteQuery = `mutation { deleteProjectV2Item(input: {projectId: "${projectItem.project.id}", itemId: "${projectItem.id}"}) { clientMutationId } }`;
      runQuery(deleteQuery);
      console.log("Issue removed from project.");
    } else {
      console.log("No action taken as label is not 'Archive' or 'Remove'.");
    }
  } else {
    console.log("No associated project found for this issue.");
  }
} catch (error) {
  console.error("Error:", error.message);
}
