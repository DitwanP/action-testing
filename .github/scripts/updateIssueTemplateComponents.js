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
  const allFiles = fs.readdirSync(templateDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  // Only update these template types
  const targetPattern = /bug|accessibility|documentation|enhancement/i;
  const files = allFiles.filter((f) => targetPattern.test(f));
  if (files.length === 0) {
    console.log('No target templates (bug/accessibility/documentation) found in', templateDir);
    return;
  }
  console.log('Will update templates:', files.join(', '));
  let updatedCount = 0;

  for (const file of files) {
    const fullPath = path.join(templateDir, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    // Parse by lines and look for the dropdown block that has `id: component`.
    const lines = content.split(/\r?\n/);
    const outLines = [...lines];

    // scan for blocks starting with '  - type: dropdown'
    let i = 0;
    let changed = false;
    while (i < lines.length) {
      const line = lines[i];
      if (/^\s{2}- type:\s*dropdown\s*$/.test(line)) {
        // find block end (next top-level body item) or EOF
        const blockStart = i;
        let j = i + 1;
        while (j < lines.length && !/^\s{2}- type:/.test(lines[j])) {
          j++;
        }
        const blockEnd = j; // exclusive

        // check if this block contains 'id: component' (with any indentation)
        const blockSlice = lines.slice(blockStart, blockEnd);
        const hasIdComponent = blockSlice.some((ln) => /^\s*id:\s*component\s*$/.test(ln));
        if (hasIdComponent) {
          // find the options: line inside the block
          const optionsIndexInBlock = blockSlice.findIndex((ln) => /^\s*options:\s*$/.test(ln));
          if (optionsIndexInBlock === -1) {
            console.error(`No options: found in dropdown block for file ${file}, skipping block`);
            i = blockEnd;
            continue;
          }

          const optionsLineIndex = blockStart + optionsIndexInBlock;
          const optionsIndentMatch = lines[optionsLineIndex].match(/^(\s*)/);
          const optionsIndent = optionsIndentMatch ? optionsIndentMatch[1].length : 0;

          // determine where the options list ends: first line after optionsLineIndex that has indent <= optionsIndent and is not empty
          let k = optionsLineIndex + 1;
          while (k < blockEnd) {
            const l = lines[k];
            const leading = l.match(/^(\s*)/)[1].length;
            if (l.trim() === '') {
              k++;
              continue;
            }
            if (leading <= optionsIndent) break;
            k++;
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
          // update lines as well for further scanning
          lines.splice(optionsLineIndex, k - optionsLineIndex, ...newOptionsLines);
          changed = true;
          // advance i to just after the updated block
          i = blockStart + newOptionsLines.length;
          continue;
        }
        i = blockEnd;
        continue;
      }
      i++;
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
