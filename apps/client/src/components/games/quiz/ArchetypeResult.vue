<template>
  <div class="archetype-result">
    <!-- Result Header -->
    <div class="result-header">
      <span class="result-label">Your Archetype</span>
      <h2 class="result-title">{{ resultTitle }}</h2>
    </div>

    <!-- Radar Chart -->
    <div class="radar-section">
      <RadarChart
        :axes="axisLabels"
        :primary-color="theme.primaryColor"
        :secondary-color="theme.secondaryColor"
      />
    </div>

    <!-- Result Image -->
    <div v-if="resultImage" class="result-image-wrapper">
      <img :src="resultImage" :alt="resultTitle" class="result-image" loading="lazy" />
    </div>

    <!-- Result Description -->
    <div class="result-description" v-html="parsedResultDescription"></div>

    <!-- Axis Breakdown -->
    <div class="axis-breakdown">
      <h3 class="breakdown-title">Your Profile</h3>
      <div class="axis-items">
        <div
          v-for="axis in axisLabels"
          :key="axis.id"
          class="axis-item"
        >
          <div class="axis-labels">
            <span class="axis-low" :class="{ active: axis.direction === 'low' }">
              {{ axis.lowLabel }}
            </span>
            <span class="axis-high" :class="{ active: axis.direction === 'high' }">
              {{ axis.highLabel }}
            </span>
          </div>
          <div class="axis-bar">
            <div class="axis-bar-track">
              <div
                class="axis-bar-fill"
                :style="{ width: `${axis.normalizedScore}%` }"
              ></div>
              <div
                class="axis-bar-indicator"
                :style="{ left: `${axis.normalizedScore}%` }"
              ></div>
            </div>
          </div>
          <div class="axis-score">{{ axis.normalizedScore }}%</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import RadarChart from './RadarChart.vue';
import type { ArchetypeScoreResult } from '@top-x/shared/quiz/scoring';
import type { QuizThemeConfig } from '@top-x/shared/types/quiz';

interface Props {
  result: ArchetypeScoreResult;
  theme: QuizThemeConfig;
}

const props = defineProps<Props>();

const resultTitle = computed(() => {
  return props.result.result?.title ?? 'Your Archetype';
});

// Markdown parsing function
function parseMarkdown(text: string): string {
  if (!text) return '';

  const lines = text.split('\n');
  const result: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLanguage = '';
  let tableRows: string[][] = [];
  let isInTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks (```)
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        const codeHtml = codeBlockContent.join('\n');
        const langClass = codeBlockLanguage ? ` class="language-${codeBlockLanguage}"` : '';
        result.push(`<pre${langClass}><code>${codeHtml}</code></pre>`);
        inCodeBlock = false;
        codeBlockContent = [];
        codeBlockLanguage = '';
      } else {
        // Start of code block
        inCodeBlock = true;
        codeBlockLanguage = line.trim().substring(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Handle tables
    if (isTableRow(line)) {
      if (!isInTable) {
        // Start of table
        isInTable = true;
        tableRows = [];
      }
      tableRows.push(parseTableRow(line));

      // Check if next line is table separator or end of table
      const nextLine = lines[i + 1];
      if (!nextLine || !isTableRow(nextLine) || isTableSeparator(nextLine)) {
        if (isTableSeparator(nextLine)) {
          i++; // Skip separator line
        }
        // End of table, generate HTML
        result.push(generateTableHtml(tableRows));
        tableRows = [];
        isInTable = false;
      }
      continue;
    } else if (isInTable) {
      // End of table
      result.push(generateTableHtml(tableRows));
      tableRows = [];
      isInTable = false;
    }

    // Handle headers (# ## ###)
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const content = headerMatch[2];
      result.push(`<h${level}>${parseInlineMarkdown(content)}</h${level}>`);
      continue;
    }

    // Handle blockquotes (>)
    if (line.trim().startsWith('>')) {
      const content = line.trim().substring(1).trim();
      result.push(`<blockquote>${parseInlineMarkdown(content)}</blockquote>`);
      continue;
    }

    // Handle lists (- or * or numbered)
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const marker = listMatch[2];
      const content = listMatch[3];

      // Check if this starts a new list or continues existing
      const isOrdered = /^\d+\./.test(marker);
      const listType = isOrdered ? 'ol' : 'ul';

      // For now, simple list handling - can be enhanced for nested lists
      result.push(`<${listType}><li>${parseInlineMarkdown(content)}</li></${listType}>`);
      continue;
    }

    // Handle empty lines
    if (line.trim() === '') {
      if (result.length > 0 && !result[result.length - 1].startsWith('<p class="empty-line">')) {
        result.push('<p class="empty-line"><br></p>');
      }
      continue;
    }

    // Regular paragraphs
    result.push(`<p>${parseInlineMarkdown(line)}</p>`);
  }

  // Handle unclosed code block
  if (inCodeBlock && codeBlockContent.length > 0) {
    const codeHtml = codeBlockContent.join('\n');
    const langClass = codeBlockLanguage ? ` class="language-${codeBlockLanguage}"` : '';
    result.push(`<pre${langClass}><code>${codeHtml}</code></pre>`);
  }

  // Handle unclosed table
  if (isInTable && tableRows.length > 0) {
    result.push(generateTableHtml(tableRows));
  }

  return result.join('');

  // Helper functions for table parsing
  function isTableRow(line: string): boolean {
    return line.trim().startsWith('|') && line.trim().endsWith('|');
  }

  function isTableSeparator(line: string): boolean {
    if (!isTableRow(line)) return false;
    const cells = parseTableRow(line);
    return cells.every(cell => /^:?-+:?$/.test(cell.trim()));
  }

  function parseTableRow(line: string): string[] {
    return line
      .split('|')
      .slice(1, -1) // Remove first and last empty elements
      .map(cell => cell.trim());
  }

  function generateTableHtml(rows: string[][]): string {
    if (rows.length === 0) return '';

    let html = '<table><tbody>';

    for (let i = 0; i < rows.length; i++) {
      const isHeaderRow = i === 0;
      const tag = isHeaderRow ? 'th' : 'td';
      const rowTag = isHeaderRow ? '<thead><tr>' : '<tr>';

      html += rowTag;
      for (const cell of rows[i]) {
        html += `<${tag}>${parseInlineMarkdown(cell)}</${tag}>`;
      }
      html += isHeaderRow ? '</tr></thead><tbody>' : '</tr>';
    }

    html += '</tbody></table>';
    return html;
  }

  // Helper function for inline markdown parsing
  function parseInlineMarkdown(text: string): string {
    return text
      // Strikethrough ~~text~~
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      // Bold **text** or __text__
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italic *text* or _text_
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Inline code `code`
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Links [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Images ![alt](url)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
      // Preserve multiple spaces
      .replace(/  +/g, (match) => '&nbsp;'.repeat(match.length));
  }
}

const resultDescription = computed(() => {
  return props.result.result?.description ?? '';
});

const parsedResultDescription = computed(() => {
  return parseMarkdown(resultDescription.value);
});

const resultImage = computed(() => {
  return props.result.result?.imageUrl ?? null;
});

const axisLabels = computed(() => {
  return props.result.axisLabels ?? [];
});
</script>

<style scoped>
.archetype-result {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  text-align: center;
}

/* Result Header */
.result-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--quiz-primary, #6366f1);
  font-weight: 600;
}

.result-title {
  font-size: clamp(1.75rem, 5vw, 2.5rem);
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, var(--quiz-primary, #6366f1), var(--quiz-secondary, #ec4899));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Radar Section */
.radar-section {
  padding: 1rem 0;
}

/* Result Image */
.result-image-wrapper {
  display: flex;
  justify-content: center;
}

.result-image {
  max-width: 150px;
  max-height: 150px;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* Result Description */
.result-description {
  font-size: 1.20rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  margin: 0;
  max-width: 500px;
  margin: 0 auto;
}

/* Enhanced markdown styles for result descriptions */
.result-description h1,
.result-description h2,
.result-description h3,
.result-description h4,
.result-description h5,
.result-description h6 {
  color: var(--color-text-primary);
  font-weight: 700;
  margin: 1rem 0 0.5rem 0;
  line-height: 1.2;
}

.result-description h1 { font-size: 1.5rem; }
.result-description h2 { font-size: 1.4rem; }
.result-description h3 { font-size: 1.3rem; }
.result-description h4 { font-size: 1.2rem; }
.result-description h5 { font-size: 1.1rem; }
.result-description h6 { font-size: 1rem; }

.result-description blockquote {
  border-left: 3px solid var(--quiz-primary, #6366f1);
  padding-left: 0.75rem;
  margin: 0.75rem 0;
  font-style: italic;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
}

.result-description ul,
.result-description ol {
  margin: 0.75rem 0;
  padding-left: 1.25rem;
}

.result-description li {
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.result-description pre {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.75rem;
  margin: 0.75rem 0;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.4;
}

.result-description code {
  background: rgba(0, 0, 0, 0.2);
  padding: 0.15rem 0.3rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
}

.result-description a {
  color: var(--quiz-primary, #6366f1);
  text-decoration: underline;
}

.result-description img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 0.5rem 0;
}

.result-description del {
  text-decoration: line-through;
  opacity: 0.7;
}

.result-description table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  overflow: hidden;
}

.result-description thead {
  background: rgba(255, 255, 255, 0.1);
}

.result-description th,
.result-description td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.result-description th {
  font-weight: 600;
  color: var(--color-text-primary);
}

.result-description td {
  color: var(--color-text-secondary);
}

.result-description tbody tr:hover {
  background: rgba(255, 255, 255, 0.03);
}

/* Axis Breakdown */
.axis-breakdown {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 1.25rem;
  text-align: left;
}

.breakdown-title {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-tertiary);
  margin: 0 0 1rem;
  text-align: center;
}

.axis-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.axis-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
  align-items: center;
}

.axis-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  font-weight: 500;
  grid-column: 1 / -1;
}

.axis-low,
.axis-high {
  color: var(--color-text-tertiary);
  transition: color 0.3s ease;
}

.axis-low.active,
.axis-high.active {
  color: var(--quiz-primary, #6366f1);
  font-weight: 600;
}

.axis-bar {
  flex: 1;
  position: relative;
}

.axis-bar-track {
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: visible;
  position: relative;
}

.axis-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--quiz-primary, #6366f1), var(--quiz-secondary, #ec4899));
  border-radius: 999px;
  transition: width 0.5s ease;
}

.axis-bar-indicator {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  background: var(--quiz-primary, #6366f1);
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: left 0.5s ease;
}

.axis-score {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  min-width: 40px;
  text-align: right;
}

@media (max-width: 768px) {
  .axis-breakdown {
    padding: 1rem;
  }

  .axis-labels {
    font-size: 0.8rem;
  }

  .axis-bar-track {
    height: 6px;
  }

  .axis-bar-indicator {
    width: 14px;
    height: 14px;
  }
}
</style>

