#!/usr/bin/env node
/**
 * Convert X Users CSV to Pyramid Config
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CSV line handling quoted fields
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Main function
function main() {
  // Read the CSV
  const csvPath = '/Users/liormalenboim/Downloads/x_users.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').slice(1); // Skip header

  // Color mapping for tags
  const colorMapping = {
    '#2563EB': 'ימין',
    '#E11D48': 'שמאל',
    '#843F9A': 'לא ידוע'
  };

  // Parse items
  const items = [];
  lines.forEach((line, index) => {
    if (!line.trim()) return;

    try {
      const parts = parseCsvLine(line);
      if (parts.length < 5) {
        console.log(`Skipping line ${index + 2}: insufficient fields`);
        return;
      }

      const name = parts[0].replace(/"/g, '').trim();
      const label = parts[1].replace(/"/g, '').trim();
      const src = parts[2].replace(/"/g, '').trim();
      const description = parts[3].replace(/"/g, '').trim();
      const tag = parts[4].replace(/"/g, '').trim();

      if (!name || !label || !src) {
        console.log(`Skipping line ${index + 2}: missing required fields`);
        return;
      }

      items.push({
        id: name,
        label: label,
        name: label,
        src: src,
        description: description,
        color: tag,
        active: true,
        source: name
      });
    } catch (error) {
      console.log(`Error parsing line ${index + 2}:`, error.message);
    }
  });

  console.log(`Parsed ${items.length} X users from CSV`);

  // Create pyramid config
  const pyramidConfig = {
    id: 'topx2025il',
    name: 'טופ X 2025 ישראל',
    description: 'מי הכי חם בטוויטר הישראלי?',
    gameTypeId: 'PyramidTier',
    active: true,
    language: 'il',
    custom: {
      items,
      rows: [
        { id: 1, label: 'הכי חמים', points: 100 },
        { id: 2, label: 'חמים מאוד', points: 75 },
        { id: 3, label: 'חמים', points: 50 },
        { id: 4, label: 'פושרים', points: 25 },
        { id: 5, label: 'קרירים', points: 0 }
      ],
      sortItems: { orderBy: 'id', order: 'asc' },
      HideRowLabel: false,
      shareImageTitle: 'החשבונות הכי חמים בטוויטר הישראלי',
      poolHeader: 'כל החשבונות',
      worstHeader: 'הכי קריר',
      worstPoints: 0,
      worstShow: true,
      communityItems: [],
      communityHeader: '',
      colorsTag: {
        'ימין': '#2563EB',
        'שמאל': '#E11D48',
        'לא ידוע': '#843F9A'
      }
    }
  };

  // Save to file
  const outputPath = path.resolve(process.cwd(), 'x-users-pyramid.json');
  fs.writeFileSync(outputPath, JSON.stringify(pyramidConfig, null, 2), 'utf8');
  console.log(`Created ${outputPath} with pyramid config`);
  console.log('Sample item:', JSON.stringify(items[0], null, 2));
}

main();
