const { execSync } = require("child_process");

// Environment variables from the GitHub Action
const owner = process.env.OWNER;
const repo = process.env.REPO;
const issueNumber = process.env.ISSUE_NUMBER;
const labelName = process.env.LABEL_NAME;

// Function to execute a GitHub GraphQL command
function runQuery(query) {
  const command = `gh api graphql -f query='${query}' -F owner="${owner}" -F repo="${repo}" -F issueNumber=${issueNumber}`;
  console.log("Command:", command);
  return execSync(command, { encoding: "utf-8" });
}

// GraphQL query to find the project associated with the issue
const query = `
  query($owner: String!, $repo: String!, $issueNumber: Int!) {
    repository(owner: $owner, name: $repo) {
      id
      nameWithOwner
      description
      issue(number: $issueNumber) {
        id
        title
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
`;

try {
  const result = runQuery(query);
  const parsedResult = JSON.parse(result);
  console.log("Parsed result:", JSON.stringify(parsedResult, null, 2));
  const projectItem = parsedResult.data.repository.issue.projectItems.nodes[0];
  console.log("Project Item:", projectItem);

  if (projectItem) {
    console.log(
      `Issue #${issueNumber} is in design project: ${projectItem.project.title} (URL: ${projectItem.project.url})`
    );

    if (labelName === "ready for dev") {
      const archiveQuery = `mutation { archiveProjectV2Item(input: {projectId: "${projectItem.project.id}", itemId: "${projectItem.id}"}) { clientMutationId } }`;
      runQuery(archiveQuery);
      console.log("Issue archived in project.");
    } else {
      console.log("No action taken as label is not 'ready for dev'.");
    }
  } else {
    console.log("No associated project found for this issue.");
  }
} catch (error) {
  console.error("Error:", error.message);
}
