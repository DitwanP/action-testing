#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const componentsDir = path.join(process.cwd(), 'packages', 'src', 'components');
const componentBlacklist = new Set(['avoid-me', 'dont-add-me-to-list', 'should-not-be-included']);

function titleize(folderName) {
  return folderName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function main() {
  if (!fs.existsSync(componentsDir)) {
    console.error('Components directory not found:', componentsDir);
    process.exit(2);
  }

  const entries = fs.readdirSync(componentsDir, { withFileTypes: true });
  const componentFolders = entries
    .filter((directoryEntry) => directoryEntry.isDirectory())
    .map((directoryEntry) => directoryEntry.name)
    .sort((left, right) => left.localeCompare(right, 'en'));

  // Exclude non user facing component folders (blacklist)
  const folders = componentFolders.filter((name) => !componentBlacklist.has(name));
  const templateDir = path.join(process.cwd(), '.github', 'ISSUE_TEMPLATE');
  const allFiles = fs.readdirSync(templateDir);

  // Only update these template types
  const targetPattern = /bug|accessibility|documentation|enhancement/i;
  const files = allFiles.filter((f) => targetPattern.test(f));
  if (files.length === 0) {
    console.log('No templates for bug, accessibility, documentation, or enhancement found in', templateDir);
    return;
  }
  console.log('Updating following templates:', files.join(', '));
  let updatedCount = 0;

  for (const file of files) {
    const fullPath = path.join(templateDir, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    // Parse by lines and look for the input that has `id: which-component`.
    const lines = content.split(/\r?\n/);
    const outputLines = [...lines];

    // find the "which-component" id line
    const whichComponentIndex = lines.findIndex((line) => /^\s*id:\s*which-component\s*$/.test(line));

    let changed = false;
    if (whichComponentIndex !== -1) {
      // find the next line with "options:" under "which-component"
      let i = whichComponentIndex + 1;
      while (i < lines.length && !/^\s*options:\s*$/.test(lines[i])) i++;
      const componentOptionsLineIdx = i;
      if (componentOptionsLineIdx >= lines.length) {
        console.error(`No options: line found after which-component in ${file}, skipping`);
        continue;
      }

      const optionsIndentMatch = lines[componentOptionsLineIdx].match(/^(\s*)/);
      const optionsIndent = optionsIndentMatch ? optionsIndentMatch[1].length : 0;

      // determine where the options list ends: scan downward and stop when we encounter the next '- type:' line (start of next input)
      let componentsListEndIdx = componentOptionsLineIdx + 1;
      while (componentsListEndIdx < lines.length) {
        // stop when we hit the next input marker '- type:'
        if (/^\s*\-\s*type:/.test(lines[componentsListEndIdx])) break;
        componentsListEndIdx++;
      }

      // build new options lines with same indentation
      const indent = ' '.repeat(optionsIndent);
      const newOptionsLines = [];
      newOptionsLines.push(indent + 'options:');
      const optionIndent = indent + '  ';
      newOptionsLines.push(optionIndent + '- N/A');
      for (const name of folders) {
        newOptionsLines.push(optionIndent + '- ' + titleize(name));
      }

      // replace in outputLines from componentOptionsLineIdx to componentsListEndIdx-1
      outputLines.splice(componentOptionsLineIdx, componentsListEndIdx - componentOptionsLineIdx, ...newOptionsLines);
      // update lines as well for any further processing
      lines.splice(componentOptionsLineIdx, componentsListEndIdx - componentOptionsLineIdx, ...newOptionsLines);
      changed = true;
    }

    if (changed) {
      const newContent = outputLines.join('\n');
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log('Updated', file, 'with', folders.length, 'components');
        updatedCount++;
      }
    }
  }

  if (updatedCount === 0) {
    console.log('No templates needed updating');
  } else {
    console.log('Updated', updatedCount, 'template(s)');
  }
}

main();
