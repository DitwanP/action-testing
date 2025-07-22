// @ts-check
const {
  labels: { bug },
} = require("./support/resources");

/** @param {import('github-script').AsyncFunctionArguments} AsyncFunctionArguments */
module.exports = async ({ github, context }) => {
  const { repo, owner } = context.repo;

  const payload = /** @type {import('@octokit/webhooks-types').IssuesEvent} */ (context.payload);
  const {
    action,
    issue: { body, number: issue_number },
  } = payload;

  if (!body) {
    console.log("could not determine the issue body");
    return;
  }

  const regressionRegex = new RegExp(
    action === "edited"
      ? // the way GitHub parses the issue body into plaintext
        // requires this exact format for edits
        "(?<=### Regression \r\n\r\n).+"
      : // otherwise it depends on the submitter's OS
        "(?<=### Regression[\r\n|\r|\n]{2}).+$",
    "m",
  );

  const regressionRegexMatch = body.match(regressionRegex);

  console.log(`body: ${body}`);
  console.log(`regressionRegex: ${regressionRegex}`);
  console.log(`regressionRegexMatch: ${regressionRegexMatch}`);

  // If issue does not have "No response" under the regression section then add regression label, otherwise log message.
  if (regressionRegexMatch) {
    const regressionVersion = (regressionRegexMatch && regressionRegexMatch[0] ? regressionRegexMatch[0] : "").trim();

    console.log(`Regression version: ${regressionVersion}`);
    console.log(`Regex match: ${regressionRegexMatch[0]}`);
  
    if (regressionVersion !== "No response") {
      await github.rest.issues.addLabels({
        issue_number,
        owner,
        repo,
        labels: [bug.regression],
      });
    } else {
      console.log("No regression version provided, not adding regression label.");
    }
  } 
};
