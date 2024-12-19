const { execSync } = require("child_process");

// Environment variables from the GitHub Action
const owner = process.env.OWNER;
const repo = process.env.REPO;
const issueNumber = process.env.ISSUE_NUMBER;
const labelName = process.env.LABEL_NAME;

// Function to execute a GitHub GraphQL command
function runQuery(query) {
  return execSync(
    `gh api graphql \
    -F owner="${owner}" -F repo="${repo}" -F issueNumber=${issueNumber} \
    -f query='${query}'`,
    { encoding: "utf-8" }
  );
}

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
`;

try {
  const result = runQuery(query);
  console.log("Raw query result:", result);
  const parsedResult = JSON.parse(result);
  console.log("Parsed result:", parsedResult);
  const projectItem = parsedResult.data.repository.issue.projectItems.nodes[0];

  if (projectItem) {
    console.log(
      `Issue is in project: ${projectItem.project.title} (URL: ${projectItem.project.url})`
    );

    if (labelName === "ready for dev") {
      const archiveQuery = `mutation { archiveProjectV2Item(input: {projectId: "${projectItem.project.id}", itemId: "${projectItem.id}"}) { clientMutationId } }`;
      runQuery(archiveQuery);
      console.log("Issue archived in project.");
    } else if (labelName === "good first issue") {
      console.log("IT'S ALIVE! 🤖");
    } else {
      console.log("No action taken as label is not 'ready for dev'.");
    }
  } else {
    console.log("No associated project found for this issue.");
  }
} catch (error) {
  console.error("Error:", error.message);
}
