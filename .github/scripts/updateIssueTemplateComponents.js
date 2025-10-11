#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const componentsDir = path.join(process.cwd(), 'packages', 'src', 'components');

function titleize(folderName) {
  return folderName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildOptionsList(folders) {
  const lines = [];
  lines.push('      options:');
  lines.push('        - N/A');
  for (const name of folders) {
    lines.push('        - ' + titleize(name));
  }
  return lines.join('\n') + '\n';
}

function main() {
  if (!fs.existsSync(componentsDir)) {
    console.error('components directory not found:', componentsDir);
    process.exit(2);
  }

  const entries = fs.readdirSync(componentsDir, { withFileTypes: true });
  const componentFolders = entries
    .filter((directoryEntry) => directoryEntry.isDirectory())
    .map((directoryEntry) => directoryEntry.name)
    .sort((left, right) => left.localeCompare(right, 'en'));

  // Exclude internal-only component folders (blacklist)
  const exclude = new Set(['avoid-me', 'dont-add-me-to-list', 'should-not-be-included']);
  const folders = componentFolders.filter((name) => !exclude.has(name));

  const templateDir = path.join(process.cwd(), '.github', 'ISSUE_TEMPLATE');
  const allFiles = fs.readdirSync(templateDir);
  // Only update these template types
  const targetPattern = /bug|accessibility|documentation|enhancement/i;
  const files = allFiles.filter((f) => targetPattern.test(f));
  if (files.length === 0) {
    console.log('No templates for bug, accessibility, documentation, or enhancement found in', templateDir);
    return;
  }
  console.log('Will update templates:', files.join(', '));
  let updatedCount = 0;

  for (const file of files) {
    const fullPath = path.join(templateDir, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    // Parse by lines and look for the input that has `id: which-component`.
    const lines = content.split(/\r?\n/);
    const outLines = [...lines];

    // find the "which-component" id line
    const whichComponentIndex = lines.findIndex((line) => /^\s*id:\s*which-component\s*$/.test(line));

    let changed = false;
    if (whichComponentIndex !== -1) {
      // find the next line with "options:" under "which-component"
      let i = whichComponentIndex + 1;
      while (i < lines.length && !/^\s*options:\s*$/.test(lines[i])) i++;
      const optionsLineIndex = i;
      if (optionsLineIndex >= lines.length) {
        console.error(`No options: line found after which-component in ${file}, skipping`);
        continue;
      }

      const optionsIndentMatch = lines[optionsLineIndex].match(/^(\s*)/);
      const optionsIndent = optionsIndentMatch ? optionsIndentMatch[1].length : 0;

      // determine where the options list ends: scan downward and include only contiguous list items and blank lines
      // stop when we encounter the next '- type:' line (start of next input) or a non-list, non-blank line
      let k = optionsLineIndex + 1;
      while (k < lines.length) {
        const trimmed = lines[k].trim();
        // if we hit the next input marker '- type:' stop — this preserves the '- type:' line
        if (/^\-\s*type:/.test(trimmed)) break;
        if (trimmed === '') {
          k++; // allow blank lines within the options list
          continue;
        }
        // list items start with '- ' after trimming
        if (trimmed.startsWith('- ')) {
          k++;
          continue;
        }
        break; // stop at the first non-list, non-blank line
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

      // replace in outLines from optionsLineIndex .. k-1
      outLines.splice(optionsLineIndex, k - optionsLineIndex, ...newOptionsLines);
      // update lines as well for any further processing
      lines.splice(optionsLineIndex, k - optionsLineIndex, ...newOptionsLines);
      changed = true;

    }

    if (changed) {
      const newContent = outLines.join('\n');
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
