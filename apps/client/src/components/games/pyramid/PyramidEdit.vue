
<!-- PyramidEdit.vue -->
<template>
  <section class="section">
    <div class="container has-text-centered">
      <h1 class="main-game-title" ref="gameTitleRef" :style="titleStyle" v-html="props.gameHeader"></h1>
      
      <!-- Step Instruction -->
      <div class="step-guide-container">
        <div class="step-guide" :class="[
          { 'step-2-active': !!selectedItem },
          { 'step-3-active': isPyramidFull && !selectedItem }
        ]">
          <div class="step-item step-1">
            <span class="step-number">1</span>
            <span class="step-text">{{ t('games.pyramid.step1') }}</span>
          </div>
          <div class="step-arrow arrow-1" :style="{ '--arrow-rotation': localeStore.direction === 'rtl' ? '180deg' : '0deg' }">
            <font-awesome-icon :icon="['fas', 'arrow-right']" class="arrow-icon" />
          </div>
          <div class="step-item step-2">
            <span class="step-number">2</span>
            <span class="step-text">{{ t('games.pyramid.step2') }}</span>
          </div>
          <div class="step-arrow arrow-2" :style="{ '--arrow-rotation': localeStore.direction === 'rtl' ? '180deg' : '0deg' }">
            <font-awesome-icon :icon="['fas', 'arrow-right']" class="arrow-icon" />
          </div>
          <div class="step-item step-3">
            <span class="step-number">3</span>
            <span class="step-text">{{ t('games.pyramid.step3') }}</span>
          </div>
        </div>
      </div>

      <div class="pyramid-interactive-wrapper">
        <button v-if="props.gameInstruction" class="info-floating-button" @click="openInstructionsModal" :title="t('gameInfo.howToPlay')">
          <font-awesome-icon :icon="['fas', 'circle-info']" />
        </button>
        <div class="pyramid" ref="pyramidRef">
        <div v-for="(row, rowIndex) in pyramid" :key="rowIndex" class="pyramid-row-container">
          <div class="pyramid-row-wrapper">
            <div class="pyramid-row">
              <div
                v-for="(slot, colIndex) in row"
                :key="colIndex"
                class="pyramid-slot box"
                :class="[
                  { 'selected': isSelected(slot.image) },
                  { 'highlight-empty': (selectedItem || draggedItem) && !slot.image },
                  { 'can-swap': (selectedItem || draggedItem) && slot.image && !isSelected(slot.image) },
                  { 'drop-hover': isDroppable(rowIndex, colIndex) },
                  'dark-slot'
                ]"
                :style="{ backgroundColor: rows[rowIndex]?.color || '' }"
                @dragover.prevent
                @dragenter.prevent="onDragEnterSlot(rowIndex, colIndex)"
                @dragleave.prevent="onDragLeaveSlot"
                @drop="() => onDropToSlot(rowIndex, colIndex)"
                @click="onSlotClick(rowIndex, colIndex)"
              >
                <div class="hex-outer" :class="{ 'has-image': slot.image }">
                  <div class="hex-border" :style="{ background: slot.image?.color || '' }"></div>
                  <div class="hex-inner">
                    <div v-if="slot.image" class="draggable-item slot-style">
                      <div v-if="(selectedItem || draggedItem) && !isSelected(slot.image)" class="swap-badge-mobile">
                        <font-awesome-icon :icon="['fas', 'arrows-rotate']" />
                      </div>
                      <div v-if="isSelected(slot.image)" class="remove-item-badge" @click.stop="removeItemFromSlot(rowIndex, colIndex)">
                        <font-awesome-icon :icon="['fas', 'trash-can']" />
                      </div>
                      <img :src="slot.image.src" class="draggable-image" crossorigin="anonymous" />
                    </div>
                    <div v-else class="slot-label-container">
                      <div class="tier-label">{{ toRoman(rowIndex + 1) }}</div>
                      <div class="slot-points has-text-success">+{{ rows[rowIndex]?.points || 0 }}</div>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>
            <!-- Animation container for row 2 -->
            <div v-if="rowIndex === 1 && animatedPoints" class="animation-container">
              <div class="animated-points has-text-success">{{ animatedPoints }}</div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <!-- Worst Item Slot -->
      <div v-if="worstShow" class="worst-item-container">
        <h3 class="subtitle has-text-centered has-text-white" style="margin-bottom:5px;font-size: 18px">{{ props.worstHeader }}</h3>
        <div class="worst-row-wrapper">
          <div
            class="pyramid-slot box worst-slot dark-slot"
            :class="[
              { 'selected': isSelected(worstItem) },
              { 'highlight-empty': (selectedItem || draggedItem) && !worstItem },
              { 'can-swap': (selectedItem || draggedItem) && worstItem && !isSelected(worstItem) },
              { 'drop-hover': isDroppable(-1, -1) }
            ]"
            @dragover.prevent
            @dragenter.prevent="onDragEnterSlot(-1, -1)"
            @dragleave.prevent="onDragLeaveSlot"
            @drop="onDropToWorst"
            @click="onWorstSlotClick"
          >
            <div class="hex-outer worst" :class="{ 'has-image': worstItem }">
              <div class="hex-border"></div>
              <div class="hex-inner">
                <div v-if="worstItem" class="draggable-item slot-style">
                  <div v-if="(selectedItem || draggedItem) && !isSelected(worstItem)" class="swap-badge-mobile">
                    <font-awesome-icon :icon="['fas', 'arrows-rotate']" />
                  </div>
                  <div v-if="isSelected(worstItem)" class="remove-item-badge danger" @click.stop="removeWorstItem">
                    <font-awesome-icon :icon="['fas', 'trash-can']" />
                  </div>
                  <img :src="worstItem.src" class="draggable-image" crossorigin="anonymous" />
                </div>
                <div v-else class="worst-slot-label-container">
                  <div class="tier-label has-text-danger">{{ t('games.pyramid.worst') }}</div>
                  <div class="worst-slot-points has-text-danger">{{ props.worstPoints || 0 }}</div>
                </div>
              </div>
            </div>
          </div>
          <!-- Animation container for worst slot -->
          <div v-if="worstAnimatedPoints" class="worst-animation-container">
            <div class="animated-points has-text-danger">{{ worstAnimatedPoints }}</div>
          </div>
        </div>
      </div>
<div style="padding: 10px;">
      <button 
        class="btn-primary vote-button"
        :class="{ 'pulse-vote': isPyramidFull }"
        :disabled="isSubmitting"
        @click="submitPyramid"
      >
        <span class="btn-content">
          {{ t('games.pyramid.placeVote') }}
          <i class="fas fa-arrow-right btn-icon" :class="{ 'fa-flip-horizontal': localeStore.direction === 'rtl' }"></i>
        </span>
        <div class="btn-glow"></div>
      </button>
      </div>
      
      <!-- Pool Scroll Indicator for Mobile -->
      <div v-if="!selectedItem && isTouchDevice" class="pool-scroll-hint" @click="scrollToPool">
        <span class="hint-text">{{ t('games.pyramid.scrollToPool') }}</span>
        <font-awesome-icon :icon="['fas', 'chevron-down']" class="hint-icon" />
      </div>

      <div class="pool-controls mb-4" id="item-pool-scroll-target">
       
        <div class="field">
          <div class="control has-icons-left has-icons-right">
            <input
              class="input is-dark"
              type="text"
              :placeholder="t('games.pyramid.search')"
              v-model="searchQuery"
            />
            <span class="icon is-left">
              <font-awesome-icon :icon="['fas', 'search']" />
            </span>
            <span v-if="searchQuery" class="icon is-right is-clickable" @click="searchQuery = ''">
              <font-awesome-icon :icon="['fas', 'circle-xmark']" />
            </span>
          </div>
        </div>
        <div class="clear-link-wrapper">
          <a
            style="font-size: 14px;"
            @click.stop.prevent="clearPyramid"
          >{{ t('games.pyramid.clearPyramid') }}</a>
          <div v-if="showConfirm" class="confirm-tooltip">
            <p>{{ t('games.pyramid.confirmClear') }}</p>
            <div class="buttons">
              <button class="button is-small is-success" @click="confirmClear(true)">{{ t('games.pyramid.yes') }}</button>
              <button class="button is-small is-danger" @click="confirmClear(false)">{{ t('games.pyramid.no') }}</button>
            </div>
          </div>
        </div>
      </div>
      <h2 class="subtitle has-text-white" style="font-size: 20px;">{{ props.poolHeader }}</h2>
      <div class="image-pool drop-zone" @dragover.prevent @drop="onDropToOfficialPool">
        <div
          v-for="image in filteredOfficialPool"
          :key="image.id"
          class="pyramid-slot image-box slot-style dark-slot"
          :class="{ 'selected': isSelected(image) }"
          :draggable="!isTouchDevice"
          @dragstart="() => onDragStart(image)"
          @click.stop="() => onTapSelect(image)"
        >
          <div v-if="isSelected(image)" class="selection-badge">
            {{ t('games.pyramid.selected') }}
          </div>
          <img :src="image.src" class="draggable-image" />
          <div class="image-label">{{ image.label }}</div>
          <div class="color-indicator" :style="{ backgroundColor: image.color || '#fff' }"></div>
          <font-awesome-icon
            v-if="!props.hideInfoButton"
            :icon="['fas', 'circle-info']"
            class="info-icon"
            :class="{ 'selected': selectedInfoIcon === image.id }"
            @click.stop="showDescription(image)"
          />
        </div>
      </div>
       <div class="pool-controls mb-4">
       
    
        <div class="buttons gap-2">
        
          <CustomButton
           type="is-primary"
            :label="t('games.pyramid.addNewItem')"
            :icon="['fas', 'plus']"
            @click="showAddItemPopup"
          />
        </div>
      </div>
      <h2 class="subtitle has-text-white" style="font-size: 20px;">{{ props.communityHeader || t('games.pyramid.communityItems') }}</h2>
      
      <div class="image-pool drop-zone" @dragover.prevent @drop="onDropToCommunityPool">
        <div
          v-if="filteredCommunityPool.length === 0"
          class="empty-community-message"
        >
          <p class="has-text-centered has-text-grey-light">{{ t('games.pyramid.noCommunityItems') }}</p>
        </div>
        <div
          v-for="image in filteredCommunityPool"
          :key="image.id"
          class="pyramid-slot image-box slot-style dark-slot"
          :class="{ 'selected': isSelected(image) }"
          :draggable="!isTouchDevice"
          @dragstart="() => onDragStart(image)"
          @click.stop="() => onTapSelect(image)"
        >
          <div v-if="isSelected(image)" class="selection-badge">
            {{ t('games.pyramid.selected') }}
          </div>
          <img :src="image.src" class="draggable-image" />
          <div class="image-label">{{ image.label }}</div>
          <div class="color-indicator" :style="{ backgroundColor: image.color || '#fff' }"></div>
          <font-awesome-icon
            v-if="!props.hideInfoButton"
            :icon="['fas', 'circle-info']"
            class="info-icon"
            :class="{ 'selected': selectedInfoIcon === image.id }"
            @click.stop="showDescription(image)"
          />
          <!-- Delete button for owned community items -->
          <font-awesome-icon
            v-if="userStore.user && image.source === userStore.user.uid"
            :icon="['fas', 'trash-can']"
            class="delete-icon"
            @click.stop="showDeleteConfirmation(image)"
          />
        </div>
      </div>

      <!-- Delete Confirmation Dialog -->
      <div v-if="showDeleteConfirm && itemToDelete" class="delete-confirm-overlay" @click="confirmDelete(false)">
        <div class="delete-confirm-dialog" @click.stop>
          <p class="delete-confirm-message">Are you sure you want to delete "{{ itemToDelete.label }}"?</p>
          <p class="delete-confirm-warning">This action cannot be undone.</p>
          <div class="delete-confirm-buttons">
            <button class="button is-small is-danger" @click="confirmDelete(true)">Delete</button>
            <button class="button is-small is-text" @click="confirmDelete(false)">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Description Tab -->
      <div v-show="showTab" :class="['description-tab', { show: showTab }]">
        <div class="tab-content" @click.stop>
          <p class="question-text">{{ t('games.pyramid.questionAbout') }}{{ describedItem?.label }}?</p>
          <p class="answer-text" v-html="displayedDescription"></p>
          <button class="button is-small is-primary" @click="closeTab">{{ t('games.pyramid.close') }}</button>
        </div>
      </div>

      <!-- Add Item Modal -->
      <Teleport to="body">
        <div class="modal community-item-modal" :class="{ 'is-active': showAddCommunityItemModal }">
          <div class="modal-background" @click="closeAddCommunityItemModal"></div>
          <div class="modal-content box has-background-dark has-text-white">
            <button class="delete is-large" aria-label="close" @click="closeAddCommunityItemModal"></button>
            
            <div v-if="!userStore.user || userStore.profile?.isAnonymous" class="p-5">
              <h2 class="title is-4 has-text-white mb-4">{{ t('games.pyramid.addNewItem') }}</h2>
              <p class="mb-5">{{ userStore.profile?.isAnonymous ? 'Guests cannot add community items. Login to share your own items!' : t('games.pyramid.loginPrompt') }}</p>
              <div class="buttons">
                <CustomButton
                  type="is-primary"
                  :label="userStore.profile?.isAnonymous ? 'Login to Add Items' : 'Log in with X'"
                  @click="handleLogin"
                />
              </div>
            </div>

            <div v-else class="p-2">
              <div class="modal-header-with-button">
                <h2 class="title is-4 has-text-white mb-5">{{ isEditMode ? t('build.pyramid.modal.editTitle') : t('games.pyramid.addNewItem') }}</h2>
                <!-- Temporarily hidden - Add Me button not working
                <CustomButton
                  v-if="userStore.user && props.type === 'Xusers'"
                  type="is-info"
                  size="is-small"
                  :label="t('games.pyramid.addMe')"
                  :icon="['fas', 'user-plus']"
                  @click="() => { fillWithMyData(); openAddCommunityItemModal(); }"
                />
                -->
              </div>
              
              <!-- For Xusers: Username first -->
              <div v-if="props.type === 'Xusers'" class="field mb-4">
                <label class="label has-text-white">{{ t('build.pyramid.modal.xusersUsernameLabel') }}</label>
                <div class="control has-icons-left">
                  <span class="icon is-left" style="color: #ccc;">@</span>
                  <input
                    class="input is-dark"
                    v-model="newCommunityItem.name"
                    placeholder="e.g. amit_segal"
                    :class="{ 'is-danger': usernameExists(newCommunityItem.name) }"
                    @input="onUsernameInput(newCommunityItem)"
                  />
                </div>
                <p v-if="usernameExists(newCommunityItem.name)" class="help is-danger">This username already exists</p>
                <p v-if="newCommunityItem.name" class="help">
                  <a :href="'https://x.com/' + newCommunityItem.name" target="_blank" class="has-text-info">
                    View X Profile: https://x.com/{{ newCommunityItem.name }}
                  </a>
                </p>
              </div>

              <!-- Display Name (for both types, but label changes) -->
              <div class="field mb-4">
                <label class="label has-text-white">{{ props.type === 'Xusers' ? t('build.pyramid.modal.xusersDisplayNameLabel') : t('build.pyramid.items.displayName') }}</label>
                <input
                  class="input is-dark"
                  v-model="newCommunityItem.label"
                  :placeholder="props.type === 'Xusers' ? 'e.g. Amit Segal' : t('build.pyramid.modal.displayNamePlaceholder')"
                />
              </div>

              <!-- Image uploader -->
              <div class="field mb-5">
                <label class="label has-text-white">{{ t('build.pyramid.modal.imageLabel') }}</label>
                <ImageUploader
                  v-model="newCommunityItem.src"
                  :uploadFolder="`pyramid/${validatedGameId}/community`"
                  :cropWidth="250"
                  :cropHeight="250"
                />
                <p v-if="!newCommunityItem.src" class="help has-text-warning">{{ t('build.pyramid.modal.imageRequired') }}</p>
              </div>

              <!-- For basic type: Search Name -->
              <div v-if="props.type !== 'Xusers'" class="field mb-4">
                <label class="label has-text-white">{{ t('build.pyramid.items.searchName') }}</label>
                <input
                  class="input is-dark"
                  v-model="newCommunityItem.name"
                  :placeholder="t('build.pyramid.modal.searchNamePlaceholder')"
                  :disabled="!newCommunityItem.src || !newCommunityItem.label"
                />
              </div>

              <!-- Description (last for both types) -->
              <div class="field mb-5">
                <label class="label has-text-white">{{ t('build.pyramid.modal.descriptionLabel') }}</label>
                <textarea
                  class="textarea is-dark"
                  v-model="newCommunityItem.description"
                  :placeholder="props.type === 'Xusers' ? t('build.pyramid.modal.xusersDescriptionPlaceholder') : t('build.pyramid.modal.descriptionPlaceholder')"
                  rows="3"
                ></textarea>
              </div>

              <div class="buttons mt-6">
                <CustomButton
                  type="is-primary"
                  :label="isSaving ? 'Saving...' : (isEditMode ? 'Update' : t('build.pyramid.modal.save'))"
                  :disabled="!newCommunityItem.src || !newCommunityItem.label || isSaving || (props.type === 'Xusers' && (!newCommunityItem.name || usernameExists(newCommunityItem.name)))"
                  @click="saveNewCommunityItem"
                />
                <button class="button is-text has-text-white" @click="closeAddCommunityItemModal">
                  {{ t('build.pyramid.modal.cancel') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Instructions Modal -->
      <Teleport to="body">
        <div v-if="showInstructionsModal" class="instructions-modal-overlay" @click="closeInstructionsModal">
          <div class="instructions-modal" @click.stop>
            <button class="instructions-modal-close" @click="closeInstructionsModal" :aria-label="t('common.close')">
              <font-awesome-icon :icon="['fas', 'xmark']" />
            </button>
            <div class="instructions-modal-header">
              <h3 class="instructions-modal-title">
                <font-awesome-icon :icon="['fas', 'circle-info']" />
                {{ t('gameInfo.howToPlay') }}
              </h3>
            </div>
            <div class="instructions-modal-content">
              <div class="instructions-modal-text" v-html="parsedInstructions"></div>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { PyramidItem, PyramidRow, PyramidSlot, PyramidData, SortOption } from '@top-x/shared/types/pyramid';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCircleInfo, faSearch, faEraser, faPlus, faArrowRight, faChevronDown, faArrowsRotate, faCircleXmark, faTrashCan, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useRoute } from 'vue-router';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import ImageUploader from '@top-x/shared/components/ImageUploader.vue';
import { addCommunityItem, deleteCommunityItem as deleteCommunityItemService } from '@/services/pyramid';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';
import { useLocaleStore } from '@/stores/locale';
import { useUserStore } from '@/stores/user';

const showInstructionsModal = ref(false);

// Instructions helpers
function processLineWithTabs(line: string): string {
  // Count leading tabs
  const tabMatch = line.match(/^(\t+)/);
  if (!tabMatch) return line;
  
  const tabCount = tabMatch[1].length;
  const content = line.substring(tabMatch[0].length);
  
  // Convert tabs to spaces (4 spaces per tab) which will be preserved
  // We'll process this before the space-to-nbsp conversion
  const indentSpaces = ' '.repeat(tabCount * 4);
  return indentSpaces + content;
}

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

    // Regular paragraphs with tab processing
    result.push(`<p>${parseInlineMarkdown(processLineWithTabs(line))}</p>`);
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

const parsedInstructions = computed(() => {
  return parseMarkdown(props.gameInstruction || '');
});

const openInstructionsModal = () => {
  showInstructionsModal.value = true;
};

const closeInstructionsModal = () => {
  showInstructionsModal.value = false;
};

library.add(faCircleInfo, faSearch, faEraser, faPlus, faArrowRight, faChevronDown, faArrowsRotate, faCircleXmark, faTrashCan, faXmark);

const localeStore = useLocaleStore();
const userStore = useUserStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);

const route = useRoute();
const gameId = ref((route.query.game as string).toLowerCase());
const gameTitle = ref('');
const gameTitleRef = ref<HTMLElement | null>(null);
const titleFontSize = ref<number | null>(null);

const props = defineProps<{
  items: PyramidItem[];
  communityItems: PyramidItem[];
  rows: PyramidRow[];
  sortItems: SortOption;
  hideRowLabel: boolean;
  gameHeader: string;
  gameInstruction?: string;
  poolHeader?: string;
  communityHeader?: string;
  worstHeader?: string;
  shareText?: string;
  shareImageTitle?: string;
  worstPoints?: number;
  worstShow?: boolean;
  hideInfoButton?: boolean;
  colorsTag?: { [label: string]: string };
  userName?: string;
  type?: 'basic' | 'Xusers';
}>();

const emit = defineEmits<{
  (e: 'submit', data: PyramidData): void;
}>();

const officialPool = ref<PyramidItem[]>([]);
const communityPool = ref<PyramidItem[]>([]);
const pyramid = ref<PyramidSlot[][]>([
  [{ image: null }],
  [{ image: null }, { image: null }],
  [{ image: null }, { image: null }, { image: null }],
  [{ image: null }, { image: null }, { image: null }, { image: null }],
]);
const worstItem = ref<PyramidItem | null>(null);
const draggedItem = ref<PyramidItem | null>(null);
const selectedItem = ref<PyramidItem | null>(null);
const droppableSlot = ref<{ row: number; col: number } | null>(null);
const animatedPoints = ref<string | null>(null);
const worstAnimatedPoints = ref<string | null>(null);
const worstShow = computed(() => props.worstShow ?? true);
const isPyramidFull = computed(() => {
  const pyramidFull = pyramid.value.every(row => row.every(slot => !!slot.image));
  const worstFull = worstShow.value ? !!worstItem.value : true;
  return pyramidFull && worstFull;
});
const selectedInfoIcon = ref<string | null>(null); // Track the selected info icon by item ID

const titleStyle = computed(() => {
  if (titleFontSize.value !== null) {
    return { fontSize: `${titleFontSize.value}px` };
  }
  return {};
});

const searchQuery = ref('');
const showAddPopup = ref(false);
// Description Tab State
const showTab = ref(false);
const describedItem = ref<PyramidItem | null>(null);
const displayedDescription = ref('');
let typingInterval: ReturnType<typeof setInterval> | null = null;

const showConfirm = ref(false);
const showDeleteConfirm = ref(false);
const itemToDelete = ref<PyramidItem | null>(null);
const pyramidRef = ref<HTMLElement | null>(null);
const isTouchDevice = ref(false);
const isSubmitting = ref(false);

const scrollToPool = () => {
  const target = document.getElementById('item-pool-scroll-target');
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

onMounted(() => {
  if (analytics) {
    logEvent(analytics, 'game_view', { game_name: gameId.value || 'unknown', view_type: 'edit' });
  }
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  adjustTitleFontSize();
});

  // Load from local storage if available
  const savedPyramid = localStorage.getItem(`pyramid_${gameId.value}`);
  if (savedPyramid) {
    const parsed = JSON.parse(savedPyramid);
    pyramid.value = parsed.pyramid;
    worstItem.value = parsed.worstItem;
    console.log('PyramidEdit: Loaded state from local storage:', parsed);
    removeUsedFromPools();
  }

  // Add global click listener to close tab and reset selected info icon
  const handleOutsideClick = (event: MouseEvent) => {
    if (showTab.value) {
      const tabElement = document.querySelector('.description-tab');
      if (tabElement && !tabElement.contains(event.target as Node)) {
        closeTab();
        selectedInfoIcon.value = null; // Reset selected info icon
      }
    }
    if (showConfirm.value) {
      const confirmElement = document.querySelector('.confirm-tooltip');
      if (confirmElement && !confirmElement.contains(event.target as Node)) {
        showConfirm.value = false;
      }
    }
  };
  document.addEventListener('click', handleOutsideClick);
  
  onUnmounted(() => {
    document.removeEventListener('click', handleOutsideClick);
  });


// Save to local storage on every change
watch([pyramid, worstItem], () => {
  localStorage.setItem(`pyramid_${gameId.value}`, JSON.stringify({ pyramid: pyramid.value, worstItem: worstItem.value }));
  console.log('PyramidEdit: Saved state to local storage:', { pyramid: pyramid.value, worstItem: worstItem.value });
  removeUsedFromPools();
}, { deep: true });

const filteredOfficialPool = computed(() => {
  if (!searchQuery.value.trim()) {
    return officialPool.value;
  }
  const query = searchQuery.value.toLowerCase().trim();
  return officialPool.value.filter(item => {
    const label = item.label?.toLowerCase() || '';
    const name = item.name?.toLowerCase() || '';
    return label.includes(query) || name.includes(query);
  });
});

const filteredCommunityPool = computed(() => {
  if (!searchQuery.value.trim()) {
    return communityPool.value;
  }
  const query = searchQuery.value.toLowerCase().trim();
  return communityPool.value.filter(item => {
    const label = item.label?.toLowerCase() || '';
    const name = item.name?.toLowerCase() || '';
    return label.includes(query) || name.includes(query);
  });
});

watch(
  () => props.worstPoints,
  (newValue) => {
    console.log('PyramidEdit: worstPoints prop updated:', newValue);
  },
  { immediate: true }
);

watch(
  () => props.gameHeader,
  (newValue) => {
    console.log('PyramidEdit: gameHeader prop updated:', newValue);
    nextTick(() => {
      adjustTitleFontSize();
    });
  },
  { immediate: true }
);

const sortFunction = (a: PyramidItem, b: PyramidItem) => {
  const field = props.sortItems.orderBy;
  const dir = props.sortItems.order === 'asc' ? 1 : -1;
  const valA = a[field as keyof PyramidItem] || '';
  const valB = b[field as keyof PyramidItem] || '';
  if (field === 'id') {
    return (parseInt(valA as string, 10) - parseInt(valB as string, 10)) * dir;
  }
  return String(valA).localeCompare(String(valB)) * dir;
};

watch(
  () => props.items,
  (newItems) => {
    console.log('PyramidEdit: Items prop updated:', newItems);
    if (!newItems || !Array.isArray(newItems)) {
      console.warn('PyramidEdit: Invalid or empty items prop:', newItems);
      officialPool.value = [];
      return;
    }
    const filtered = newItems.filter(item => item.active !== false);
    const sorted = [...filtered].sort(sortFunction);
    officialPool.value = sorted;
    console.log('PyramidEdit: officialPool initialized:', officialPool.value);
    removeUsedFromPools();
  },
  { immediate: true }
);

watch(
  () => props.communityItems,
  (newItems) => {
    console.log('PyramidEdit: communityItems prop updated:', newItems);
    if (!newItems || !Array.isArray(newItems)) {
      console.warn('PyramidEdit: Invalid or empty communityItems prop:', newItems);
      communityPool.value = [];
      return;
    }
    const filtered = newItems.filter(item => item.active !== false);
    const sorted = [...filtered].sort(sortFunction);
    communityPool.value = sorted;
    console.log('PyramidEdit: communityPool initialized:', communityPool.value);
    removeUsedFromPools();
  },
  { immediate: true }
);

watch(
  () => props.sortItems,
  () => {
    console.log('PyramidEdit: sortItems prop updated:', props.sortItems);
    if (!officialPool.value.length && !communityPool.value.length) {
      console.warn('PyramidEdit: Pools are empty, skipping sort');
      return;
    }
    officialPool.value = [...officialPool.value].sort(sortFunction);
    communityPool.value = [...communityPool.value].sort(sortFunction);
    console.log('PyramidEdit: Pools sorted:', { official: officialPool.value, community: communityPool.value });
    removeUsedFromPools();
  }
);

watch(
  () => props.hideRowLabel,
  (newValue) => {
    console.log('PyramidEdit: hideRowLabel prop updated:', newValue);
  },
  { immediate: true }
);

function adjustTitleFontSize() {
  if (!gameTitleRef.value) return;

  const titleElement = gameTitleRef.value;
  const container = titleElement.parentElement;
  if (!container) return;

  const maxWidth = container.offsetWidth - 40; // Account for padding
  const baseFontSize = window.innerWidth <= 767 ? 40 : 50; // Smaller base sizes since this is 2.5rem (40px) normally
  let fontSize = baseFontSize;

  titleElement.style.fontSize = `${fontSize}px`;
  titleElement.style.whiteSpace = 'nowrap';

  // Measure text width
  const textWidth = titleElement.scrollWidth;

  // If text overflows, reduce font size
  if (textWidth > maxWidth) {
    fontSize = (maxWidth / textWidth) * fontSize;
    fontSize = Math.max(fontSize, 20); // Minimum font size for main title
    titleFontSize.value = fontSize;
  } else {
    titleFontSize.value = null; // Use default
  }
}

function clearPyramid() {
  showConfirm.value = true;
}

function confirmClear(yes: boolean) {
  showConfirm.value = false;
  if (yes) {
    if (analytics) {
      logEvent(analytics, 'user_action', { action: 'clear_pyramid', game_id: gameId.value });
    }
    // Collect all items from pyramid and worst slot
    const itemsToReturn: PyramidItem[] = [];
    pyramid.value.forEach(row => {
      row.forEach(slot => {
        if (slot.image) {
          itemsToReturn.push(slot.image);
          slot.image = null;
        }
      });
    });
    if (worstItem.value) {
      itemsToReturn.push(worstItem.value);
      worstItem.value = null;
    }
    // Separate into official and community
    const officialItems: PyramidItem[] = [];
    const communityItems: PyramidItem[] = [];
    itemsToReturn.forEach(item => {
      if (props.communityItems.some(i => i.id === item.id)) {
        communityItems.push(item);
      } else {
        officialItems.push(item);
      }
    });
    // Add back to respective pools and sort
    officialPool.value = [...officialPool.value, ...officialItems].sort(sortFunction);
    communityPool.value = [...communityPool.value, ...communityItems].sort(sortFunction);
    console.log('PyramidEdit: Pyramid cleared, items returned to pools:', { official: officialPool.value, community: communityPool.value });
  }
}

function isSelected(item: PyramidItem | null): boolean {
  return item !== null && selectedItem.value?.id === item.id;
}

function isDroppable(row: number, col: number): boolean {
  if (!selectedItem.value && !draggedItem.value) {
    return false;
  }
  return droppableSlot.value?.row === row && droppableSlot.value?.col === col;
}

function onDragStart(item: PyramidItem) {
  draggedItem.value = item;
  selectedItem.value = item;
  console.log('PyramidEdit: Drag started for item:', item);
}

function onTapSelect(item: PyramidItem) {
  selectedItem.value = selectedItem.value?.id === item.id ? null : item;
  draggedItem.value = selectedItem.value;
  console.log('PyramidEdit: Item selected via tap:', selectedItem.value);
  if (selectedItem.value) {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 500);
  }
}

function onDragEnterSlot(row: number, col: number) {
  if (draggedItem.value || selectedItem.value) {
    droppableSlot.value = { row, col };
    console.log('PyramidEdit: Drag entered slot:', { row, col });
  }
}

function onDragLeaveSlot() {
  droppableSlot.value = null;
  console.log('PyramidEdit: Drag left slot');
}

function onSlotClick(row: number, col: number) {
  console.log('PyramidEdit: Slot clicked:', { row, col });
  const targetSlot = pyramid.value[row][col];
  const targetItem = targetSlot.image;

  if (!selectedItem.value && targetItem) {
    selectedItem.value = targetItem;
    draggedItem.value = targetItem;
    console.log('PyramidEdit: Selected item from slot:', targetItem);
    return;
  }

  if (!selectedItem.value) {
    console.log('PyramidEdit: No selected item, ignoring click');
    return;
  }

  const fromSlot = findSlotContaining(selectedItem.value.id);
  const fromOfficial = officialPool.value.some(i => i.id === selectedItem.value!.id);
  const fromCommunity = communityPool.value.some(i => i.id === selectedItem.value!.id);
  const fromWorst = worstItem.value?.id === selectedItem.value.id;

  if (targetItem) {
    if (fromOfficial) {
      officialPool.value = officialPool.value.filter(i => i.id !== selectedItem.value!.id);
      officialPool.value.push(targetItem);
      console.log('PyramidEdit: Swapped official pool item with slot item:', { officialPool: officialPool.value });
    } else if (fromCommunity) {
      communityPool.value = communityPool.value.filter(i => i.id !== selectedItem.value!.id);
      communityPool.value.push(targetItem);
      console.log('PyramidEdit: Swapped community pool item with slot item:', { communityPool: communityPool.value });
    } else if (fromSlot) {
      fromSlot.image = targetItem;
      console.log('PyramidEdit: Swapped slot items:', { fromSlot, targetItem });
    } else if (fromWorst) {
      worstItem.value = targetItem;
      console.log('PyramidEdit: Swapped worst item with slot item:', { worstItem: worstItem.value });
    }
  } else if (fromOfficial) {
    officialPool.value = officialPool.value.filter(i => i.id !== selectedItem.value!.id);
    console.log('PyramidEdit: Removed item from official pool:', officialPool.value);
  } else if (fromCommunity) {
    communityPool.value = communityPool.value.filter(i => i.id !== selectedItem.value!.id);
    console.log('PyramidEdit: Removed item from community pool:', communityPool.value);
  } else if (fromSlot) {
    fromSlot.image = null;
    console.log('PyramidEdit: Removed item from slot:', fromSlot);
  } else if (fromWorst) {
    worstItem.value = null;
    console.log('PyramidEdit: Removed worst item:', worstItem.value);
  }

  targetSlot.image = selectedItem.value;
  animatedPoints.value = `+${props.rows[row]?.points || 0} ${t('games.pyramid.points')}`;
  setTimeout(() => {
    animatedPoints.value = null;
  }, 1000);
  selectedItem.value = null;
  draggedItem.value = null;
  droppableSlot.value = null;
  console.log('PyramidEdit: Placed item in slot:', { row, col, item: targetSlot.image });
}

function onDropToSlot(row: number, col: number) {
  console.log('PyramidEdit: Drop to slot:', { row, col });
  onSlotClick(row, col);
}

function onWorstSlotClick() {
  console.log('PyramidEdit: Worst slot clicked');
  if (!selectedItem.value && worstItem.value) {
    selectedItem.value = worstItem.value;
    draggedItem.value = worstItem.value;
    console.log('PyramidEdit: Selected worst item:', worstItem.value);
    return;
  }

  if (!selectedItem.value) {
    console.log('PyramidEdit: No selected item, ignoring worst slot click');
    return;
  }

  const fromSlot = findSlotContaining(selectedItem.value.id);
  const fromOfficial = officialPool.value.some(i => i.id === selectedItem.value!.id);
  const fromCommunity = communityPool.value.some(i => i.id === selectedItem.value!.id);

  if (worstItem.value) {
    if (fromOfficial) {
      officialPool.value = officialPool.value.filter(i => i.id !== selectedItem.value!.id);
      officialPool.value.push(worstItem.value);
      console.log('PyramidEdit: Swapped official pool item with worst item:', { officialPool: officialPool.value });
    } else if (fromCommunity) {
      communityPool.value = communityPool.value.filter(i => i.id !== selectedItem.value!.id);
      communityPool.value.push(worstItem.value);
      console.log('PyramidEdit: Swapped community pool item with worst item:', { communityPool: communityPool.value });
    } else if (fromSlot) {
      fromSlot.image = worstItem.value;
      console.log('PyramidEdit: Swapped slot item with worst item:', { fromSlot, worstItem: worstItem.value });
    }
  } else if (fromOfficial) {
    officialPool.value = officialPool.value.filter(i => i.id !== selectedItem.value!.id);
    console.log('PyramidEdit: Removed item from official pool for worst:', officialPool.value);
  } else if (fromCommunity) {
    communityPool.value = communityPool.value.filter(i => i.id !== selectedItem.value!.id);
    console.log('PyramidEdit: Removed item from community pool for worst:', communityPool.value);
  } else if (fromSlot) {
    fromSlot.image = null;
    console.log('PyramidEdit: Removed item from slot for worst:', fromSlot);
  }

  worstItem.value = selectedItem.value;
  worstAnimatedPoints.value = `${props.worstPoints || 0} ${t('games.pyramid.points')}`;
  setTimeout(() => {
    worstAnimatedPoints.value = null;
  }, 1000);
  selectedItem.value = null;
  draggedItem.value = null;
  droppableSlot.value = null;
  console.log('PyramidEdit: Placed item in worst slot:', worstItem.value);
}

function onDropToWorst() {
  console.log('PyramidEdit: Drop to worst slot');
  onWorstSlotClick();
}

function onDropToOfficialPool() {
  if (!selectedItem.value) {
    console.log('PyramidEdit: No selected item for official pool drop');
    return;
  }
  // Check if item belongs to official
  const isOfficial = !props.communityItems.some(i => i.id === selectedItem.value!.id);
  if (!isOfficial) {
    console.log('PyramidEdit: Item is from community, cannot drop to official pool');
    return;
  }
  const slot = findSlotContaining(selectedItem.value.id);
  const fromWorst = worstItem.value?.id === selectedItem.value.id;
  if (slot) {
    slot.image = null;
    console.log('PyramidEdit: Removed item from slot for official pool drop:', slot);
  } else if (fromWorst) {
    worstItem.value = null;
    console.log('PyramidEdit: Removed item from worst for official pool drop:', worstItem.value);
  }
  if (!officialPool.value.some(i => i.id === selectedItem.value!.id)) {
    officialPool.value.push(selectedItem.value);
    officialPool.value = officialPool.value.sort(sortFunction);
    console.log('PyramidEdit: Added item back to official pool:', officialPool.value);
  }
  selectedItem.value = null;
  draggedItem.value = null;
  droppableSlot.value = null;
}

function onDropToCommunityPool() {
  if (!selectedItem.value) {
    console.log('PyramidEdit: No selected item for community pool drop');
    return;
  }
  // Check if item belongs to community
  const isCommunity = props.communityItems.some(i => i.id === selectedItem.value!.id);
  if (!isCommunity) {
    console.log('PyramidEdit: Item is from official, cannot drop to community pool');
    return;
  }
  const slot = findSlotContaining(selectedItem.value.id);
  const fromWorst = worstItem.value?.id === selectedItem.value.id;
  if (slot) {
    slot.image = null;
    console.log('PyramidEdit: Removed item from slot for community pool drop:', slot);
  } else if (fromWorst) {
    worstItem.value = null;
    console.log('PyramidEdit: Removed item from worst for community pool drop:', worstItem.value);
  }
  if (!communityPool.value.some(i => i.id === selectedItem.value!.id)) {
    communityPool.value.push(selectedItem.value);
    communityPool.value = communityPool.value.sort(sortFunction);
    console.log('PyramidEdit: Added item back to community pool:', communityPool.value);
  }
  selectedItem.value = null;
  draggedItem.value = null;
  droppableSlot.value = null;
}

function showAddItemPopup() {
  openAddCommunityItemModal();
}

const showAddCommunityItemModal = ref(false);
const newCommunityItem = ref({
  id: '',
  label: '',
  name: '',
  src: '',
  active: true,
  source: '',
  color: '#64748B',
  description: ''
});
const isSaving = ref(false);

const validatedGameId = computed(() => {
  const id = gameId.value || `temp-${Date.now()}`;
  return id.replace(/[\/\\]/g, '');
});

// Xusers helpers
function usernameExists(username: string): boolean {
  if (!username) return false;
  const lowerUsername = username.toLowerCase().trim().replace(/^@/, '');
  
  // Check in official items
  const inOfficial = props.items.some((item) => 
    item.name?.toLowerCase().trim().replace(/^@/, '') === lowerUsername
  );
  if (inOfficial) return true;
  
  // Check in community items (both from props and local pool)
  const inCommunity = communityPool.value.some((item) => 
    item.name?.toLowerCase().trim().replace(/^@/, '') === lowerUsername
  );
  return inCommunity;
}

function onUsernameInput(item: any) {
  if (props.type === 'Xusers' && item.name) {
    // Remove @ from the beginning of the input field
    item.name = item.name.replace(/^@/, '');
    item.id = item.name.toLowerCase().trim();
  }
}

// Computed property to check if "Add me!" button should be disabled
const isAddMeDisabled = computed(() => {
  if (!userStore.user) return true;
  const userId = userStore.user.uid;
  return [...officialPool.value, ...communityPool.value].some(
    (item) => item.source === userId
  );
});

// Computed property to check if current user is already in pools (for modal button)
const isCurrentUserInPools = computed(() => {
  if (!userStore.user) return false;
  const userId = userStore.user.uid;
  return [...officialPool.value, ...communityPool.value].some(
    (item) => item.source === userId
  );
});

// Computed property to check if we're in edit mode
const isEditMode = computed(() => {
  return newCommunityItem.value.id && communityPool.value.some(item => item.id === newCommunityItem.value.id);
});

// Function to check if current user owns a community item
function isCurrentUserOwner(item: PyramidItem): boolean {
  return userStore.user && item.source === userStore.user.uid;
}

// Function to pre-fill modal with user's data
function fillWithMyData() {
  if (!userStore.user) return;
  
  if (props.type === 'Xusers') {
    // Try to get X handle from user profile
    let xHandle = '';
    
    // Try to get from profile username first (this is the X handle)
    if (userStore.profile?.username) {
      xHandle = userStore.profile.username;
    } else if (userStore.user.displayName) {
      // If we don't have it stored, try to extract from displayName or use it as fallback
      // For X auth, sometimes the displayName is the handle
      xHandle = userStore.user.displayName.replace(/^@/, '').toLowerCase();
    }
    
    // If still no handle, prompt the user
    if (!xHandle) {
      const handle = prompt('Enter your X handle (without @):');
      if (!handle) return;
      xHandle = handle.replace(/^@/, '').toLowerCase().trim();
    } else {
      xHandle = xHandle.replace(/^@/, '').toLowerCase().trim();
    }
    
    // Pre-fill the form
    newCommunityItem.value.name = xHandle;
    newCommunityItem.value.label = userStore.user.displayName || xHandle;
    // Resize profile photo to smaller size for pyramid display
    const photoURL = userStore.user.photoURL || '';
    newCommunityItem.value.src = photoURL ? `${photoURL}=s100` : '';
    newCommunityItem.value.description = ''; // Will auto-generate on save
    
    // Trigger ID generation
    onUsernameInput(newCommunityItem.value);
  } else {
    // Basic type
    newCommunityItem.value.label = userStore.user.displayName || 'Me';
    newCommunityItem.value.name = userStore.user.displayName || 'Me';
    // Resize profile photo to smaller size for pyramid display
    const photoURL = userStore.user.photoURL || '';
    newCommunityItem.value.src = photoURL ? `${photoURL}=s100` : '';
    newCommunityItem.value.description = '';
  }
}

async function addMe() {
  if (!userStore.user) {
    await handleLogin();
    if (!userStore.user) return;
  }

  // Check if user already exists in any pool
  const userId = userStore.user.uid;
  const userExists = [...officialPool.value, ...communityPool.value].some(
    (item) => item.source === 'community' && (item as any).userId === userId
  );
  
  if (userExists) {
    alert('You have already added yourself to this pyramid!');
    return;
  }
  
  // For Xusers type, add user directly without showing modal
  if (props.type === 'Xusers') {
    // We need to get the X handle from the user profile
    // For now, we'll prompt them to enter it if we don't have it
    // In a real implementation, you'd get this from the X auth provider data
    const handle = prompt('Enter your X handle (without @):');
    if (!handle) return;
    
    const cleanHandle = handle.replace(/^@/, '').toLowerCase().trim();
    
    // Check if handle already exists
    if (usernameExists(cleanHandle)) {
      alert('This username already exists in the pyramid!');
      return;
    }
    
    isSaving.value = true;
    try {
      const result = await addCommunityItem({
        gameId: gameId.value,
        itemData: {
          label: userStore.user.displayName || cleanHandle,
          name: cleanHandle,
          description: `<a target="_blank" href="https://x.com/${cleanHandle}">https://x.com/${cleanHandle}</a>`,
          color: '#64748B',
          userId: userStore.user.uid,
          userDisplayName: userStore.user.displayName || cleanHandle,
        },
        imageFile: userStore.user.photoURL as any,
      });
      
      if (result.item) {
        communityPool.value = [result.item, ...communityPool.value];
      } else if (result.error) {
        alert(result.error || 'Failed to add yourself.');
      }
    } catch (err) {
      console.error('PyramidEdit: Error in addMe:', err);
      alert('Failed to add yourself. Please try again.');
    } finally {
      isSaving.value = false;
    }
  } else {
    // Basic Add Me logic
    isSaving.value = true;
    try {
      const result = await addCommunityItem({
        gameId: gameId.value,
        itemData: {
          label: userStore.user.displayName || 'Me',
          name: userStore.user.displayName || 'Me',
          description: '',
          color: '#64748B',
          userId: userStore.user.uid,
          userDisplayName: userStore.user.displayName || 'Me',
        },
        imageFile: userStore.user.photoURL as any,
      });
      if (result.item) {
        communityPool.value = [result.item, ...communityPool.value];
      }
    } catch (err) {
      console.error('PyramidEdit: Error in addMe:', err);
    } finally {
      isSaving.value = false;
    }
  }
}

function openAddCommunityItemModal() {
  // Preserve the src if it was set by fillWithMyData
  const currentSrc = newCommunityItem.value.src;
  newCommunityItem.value = {
    id: '',
    label: '',
    name: '',
    src: currentSrc, // Keep the src if it was already set
    active: true,
    source: '',
    color: '#64748B',
    description: ''
  };
  showAddCommunityItemModal.value = true;
}

function closeAddCommunityItemModal() {
  showAddCommunityItemModal.value = false;
  isSaving.value = false;
}

async function handleLogin() {
  try {
    const success = await userStore.loginWithX();
    if (success) {
      if (analytics) {
        logEvent(analytics, 'user_action', { action: 'login', method: 'x_auth', context: 'add_item_modal' });
      }
    }
  } catch (err) {
    console.error('PyramidEdit: Login error:', err);
  }
}

async function saveNewCommunityItem() {
  if (!userStore.user) return;
  if (!newCommunityItem.value.src || !newCommunityItem.value.label) return;

  isSaving.value = true;
  try {
    let description = (newCommunityItem.value.description || '').trim();
    let name = (newCommunityItem.value.name || newCommunityItem.value.label).trim();
    let label = newCommunityItem.value.label.trim();

    if (props.type === 'Xusers') {
      const handle = name //.replace(/^@/, '').toLowerCase();
      const profileLink = `<a target="_blank" href="https://x.com/${handle}">https://x.com/${handle}</a>`;

      if (!description) {
        description = profileLink;
      } else {
        description = `${description}<br><br>${profileLink}`;
      }
    }

    const result = await addCommunityItem({
      gameId: gameId.value,
      itemData: {
        label,
        name,
        description,
        color: '#64748B',
        userId: userStore.user.uid || 'anonymous',
        userDisplayName: userStore.user.displayName || 'anonymous',
      },
      imageFile: newCommunityItem.value.src as any, // ImageUploader provides the URL/File
    });

    if (result.error || !result.item) {
      alert(result.error || 'Failed to save item.');
      return;
    }

    if (analytics) {
      logEvent(analytics, 'user_action', {
        action: isEditMode.value ? 'update_item' : 'save_item',
        game_id: gameId.value,
        item_id: result.item.id,
      });
    }

    if (isEditMode.value) {
      // Update existing item in the community pool
      const index = communityPool.value.findIndex(item => item.id === result.item.id);
      if (index !== -1) {
        communityPool.value[index] = result.item;
      }
    } else {
      // Add new item to the community pool
      communityPool.value = [result.item, ...communityPool.value];
    }

    closeAddCommunityItemModal();
  } catch (err) {
    console.error('PyramidEdit: Error saving item:', err);
    alert('Failed to save item.');
  } finally {
    isSaving.value = false;
  }
}

// Function to show delete confirmation for a community item
function showDeleteConfirmation(item: PyramidItem) {
  itemToDelete.value = item;
  showDeleteConfirm.value = true;
}

// Function to confirm delete
function confirmDelete(yes: boolean) {
  showDeleteConfirm.value = false;
  if (yes && itemToDelete.value) {
    deleteCommunityItem(itemToDelete.value);
  }
  itemToDelete.value = null;
}

// Function to delete a community item
async function deleteCommunityItem(item: PyramidItem) {
  try {
    // Call backend API to delete the item from the database
    const result = await deleteCommunityItemService({
      gameId: gameId.value,
      item: item
    });

    if (result.error || !result.success) {
      alert(result.error || 'Failed to delete item.');
      return;
    }

    // Remove from community pool
    communityPool.value = communityPool.value.filter(i => i.id !== item.id);

    // If the item is currently in the pyramid, remove it
    for (let row = 0; row < pyramid.value.length; row++) {
      for (let col = 0; col < pyramid.value[row].length; col++) {
        if (pyramid.value[row][col].image?.id === item.id) {
          pyramid.value[row][col].image = null;
        }
      }
    }

    // If the item is in the worst slot, remove it
    if (worstItem.value?.id === item.id) {
      worstItem.value = null;
    }

    console.log('PyramidEdit: Deleted community item:', item.label);
  } catch (err) {
    console.error('PyramidEdit: Error deleting item:', err);
    alert('Failed to delete item.');
  }
}

function removeItemFromSlot(row: number, col: number) {
  const item = pyramid.value[row][col].image;
  if (!item) return;

  pyramid.value[row][col].image = null;
  
  // Return to pool - check if it's an official item
  const isOfficial = props.items.some(i => i.id === item.id);
  if (isOfficial) {
    if (!officialPool.value.some(i => i.id === item.id)) {
      officialPool.value.push(item);
      officialPool.value = officialPool.value.sort(sortFunction);
    }
  } else {
    // If not official, it's community (either from props or newly added)
    if (!communityPool.value.some(i => i.id === item.id)) {
      communityPool.value.push(item);
      communityPool.value = communityPool.value.sort(sortFunction);
    }
  }

  selectedItem.value = null;
  draggedItem.value = null;
}

function removeWorstItem() {
  const item = worstItem.value;
  if (!item) return;

  worstItem.value = null;

  // Return to pool - check if it's an official item
  const isOfficial = props.items.some(i => i.id === item.id);
  if (isOfficial) {
    if (!officialPool.value.some(i => i.id === item.id)) {
      officialPool.value.push(item);
      officialPool.value = officialPool.value.sort(sortFunction);
    }
  } else {
    // If not official, it's community
    if (!communityPool.value.some(i => i.id === item.id)) {
      communityPool.value.push(item);
      communityPool.value = communityPool.value.sort(sortFunction);
    }
  }

  selectedItem.value = null;
  draggedItem.value = null;
}

function findSlotContaining(itemId: string): PyramidSlot | null {
  for (const row of pyramid.value) {
    for (const slot of row) {
      if (slot.image?.id === itemId) {
        return slot;
      }
    }
  }
  return null;
}

function removeUsedFromPools() {
  const usedIds = new Set<string>();
  pyramid.value.forEach(row => {
    row.forEach(slot => {
      if (slot.image) {
        usedIds.add(slot.image.id);
      }
    });
  });
  if (worstItem.value) {
    usedIds.add(worstItem.value.id);
  }
  officialPool.value = officialPool.value.filter(item => !usedIds.has(item.id));
  communityPool.value = communityPool.value.filter(item => !usedIds.has(item.id));
}

function toRoman(num: number): string {
  const numerals = ['I', 'II', 'III', 'IV'];
  return numerals[num - 1] || `${num}`;
}

function submitPyramid() {
  console.log('PyramidEdit: Submitting pyramid and worst item:', { pyramid: pyramid.value, worstItem: worstItem.value });
  if (analytics) {
    logEvent(analytics, 'user_action', { action: 'vote', game_id: gameId.value });
  }
  isSubmitting.value = true;
  emit('submit', { pyramid: pyramid.value, worstItem: worstItem.value });
}

function showDescription(item: PyramidItem) {
  describedItem.value = item;
  showTab.value = true;
  displayedDescription.value = '';
  selectedInfoIcon.value = item.id; // Set the selected info icon
  if (analytics) {
    logEvent(analytics, 'user_action', { action: 'view_description', game_id: gameId.value, item_id: item.id });
  }
  startTypingAnimation(item.description || 'No description available.');
}
function startTypingAnimation(fullDescription: string) {
  if (typingInterval) {
    clearInterval(typingInterval);
  }
  // Convert line breaks to <br> tags and preserve existing HTML
  const formattedDescription = fullDescription.replace(/\n/g, '<br>');

  // Check if description contains HTML tags
  const hasHTML = /<[^>]+>/.test(formattedDescription);

  if (hasHTML) {
    // For HTML content, we need to animate carefully to preserve tag structure
    animateHTMLContent(formattedDescription);
    return;
  }

  // For plain text, use typing animation
  const chars = formattedDescription.split('');

  let index = 0;
  displayedDescription.value = '';

  typingInterval = setInterval(() => {
    if (index < chars.length) {
      displayedDescription.value += chars[index];
      index++;
    } else {
      clearInterval(typingInterval!);
      typingInterval = null;
    }
  }, 40);
}

function animateHTMLContent(htmlContent: string) {
  // Extract visible text content for animation
  const visibleText = htmlContent.replace(/<[^>]*>/g, '');
  const chars = visibleText.split('');

  let charIndex = 0;
  displayedDescription.value = '';

  typingInterval = setInterval(() => {
    if (charIndex >= chars.length) {
      // Show complete HTML when animation finishes
      displayedDescription.value = htmlContent;
      clearInterval(typingInterval!);
      typingInterval = null;
      return;
    }

    // Build HTML up to current character position
    let htmlSoFar = '';
    let visibleCount = 0;
    let inTag = false;

    for (let i = 0; i < htmlContent.length && visibleCount <= charIndex; i++) {
      const char = htmlContent[i];

      if (char === '<') {
        inTag = true;
        htmlSoFar += char;
      } else if (char === '>' && inTag) {
        inTag = false;
        htmlSoFar += char;
      } else if (inTag) {
        htmlSoFar += char;
      } else {
        // Visible character
        htmlSoFar += char;
        visibleCount++;
      }
    }

    displayedDescription.value = htmlSoFar;
    charIndex++;
  }, 40);
}

function closeTab() {
  showTab.value = false;
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
  describedItem.value = null;
  displayedDescription.value = '';
  selectedInfoIcon.value = null; // Reset the selected info icon
}
</script>

<style scoped>
.modal-header-with-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.modal-header-with-button h2 {
  margin-bottom: 0 !important;
}

.box {
  padding: 0 !important;
}
.section {
  padding: 0.2rem 0.1rem;
  background-color: #000000;
  color: white;
  display: flex;
  justify-content: center;
}
.container {
  width: 100%;
  max-width: 100%;
}
.pyramid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.05rem;
  width: fit-content;
  margin: 0 auto;
  overflow: hidden !important;
}
.pyramid-row-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  margin-top: -22px; /* Tighter vertical overlap */
}
.pyramid-row-container:first-child {
  margin-top: 0;
}
.pyramid-row-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
}
.pyramid-row {
  display: flex;
  justify-content: center;
  gap: 0.05rem;
}
.pyramid-slot {
  width: 25vw;
  height: 25vw;
  max-width: 100px;
  max-height: 100px;
  min-width: 60px;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #1f1f1f;
  border: 1px dashed #444;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  text-align: center;
  overflow: hidden !important;
  box-sizing: border-box;
  margin-bottom: 0 !important;
  position: relative;
}
.pyramid-slot.drop-hover {
  background-color: #3298dc;
  transform: scale(1.05);
  border-color: #3298dc;
}
.slot-label-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}
.slot-points {
  font-size: 1rem;
  font-weight: bold;
  color: #22b573 !important;
  direction: ltr;
}
.animation-container, .worst-animation-container {
  position: absolute;
  right: -75px;
  top: 50%;
  transform: translateY(-50%);
  width: 70px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 2000;
}
.animated-points {
  font-size: 2rem;
  font-weight: 900;
  color: #c4ff00 !important; /* Vibrant Lime */
  animation: pointsPopFade 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  direction: ltr;
  white-space: nowrap;
  text-shadow: 0 4px 15px rgba(0,0,0,0.6);
  filter: drop-shadow(0 0 10px rgba(196, 255, 0, 0.5));
}
.animated-points.has-text-danger {
  color: #ff3333 !important;
  filter: drop-shadow(0 0 10px rgba(255, 51, 51, 0.5));
}
@keyframes pointsPopFade {
  0% { transform: translateY(40px) scale(0) rotate(-10deg); opacity: 0; }
  30% { transform: translateY(0) scale(1.4) rotate(5deg); opacity: 1; }
  50% { transform: translateY(-10px) scale(1.1) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-90px) scale(0.8); opacity: 0; }
}
.worst-item-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: max-content;
  margin: 0.3rem auto;
  overflow: hidden !important;
}
.worst-item-container .subtitle {
  width: 100%;
  text-align: center;
}
.worst-row-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
}
.worst-slot {
  border: 2px solid #ff3333;
  background-color: #3d1f1f;
  max-width: 100px;
  max-height: 100px;
  min-width: 60px;
  min-height: 60px;
  box-sizing: border-box;
  position: relative;
  overflow: hidden !important;
}
.worst-slot.drop-hover {
  background-color: #ff3333;
  border: 2px solid #ff3333;
  transform: scale(1.05);
}
.worst-slot-label-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}
.worst-slot-points {
  font-size: 1rem;
  font-weight: bold;
  direction: ltr;
}

.tier-label {
  color: #bbb;
  font-size: 0.9rem;
  font-weight: bold;
  pointer-events: none;
}
.tier-label.has-text-danger {
  color: #ff5555;
}
.pool-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
}
.pool-controls .field {
  width: 200px;
  margin-bottom: 0 !important;
}
.pool-controls .input {
  background-color: #2a2a2a;
  color: white;
  border-color: #444;
}
.pool-controls .icon {
  color: #bbb;
}
.image-pool {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  justify-content: center;
  border: 2px dashed #666;
  padding: 4px;
  margin-top: 0.5rem;
  background-color: #1f1f1f;
  width: 100%;
  max-width: 660px; /* Normal proportions for 4 columns */
  margin-left: auto;
  margin-right: auto;
}
.image-pool .pyramid-slot.image-box {
  width: 100% !important;
  max-width: none !important;
  height: 140px !important; /* More proportional height for desktop */
  max-height: 140px !important;
  min-height: 100px;
  padding: 0;
  position: relative;
}
.slot-style {
  width: 100%;
  height: 100%;
  border-radius: 0.5rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  background: linear-gradient(to bottom, #2a2a2a, #1f1f1f);
  border: 1px solid #444;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  position: relative;
  overflow: hidden !important;
}
.pyramid-slot .slot-style,
.worst-slot .slot-style {
  padding: 0 !important;
}
.image-box .slot-style {
  padding: 0 !important;
  position: relative;
}
.draggable-image {
  user-select: none;
  touch-action: none;
  transition: transform 0.2s ease;
}
.pyramid-slot .draggable-image,
.worst-slot .draggable-image {
  width: 100%;
  height: calc(100% - 4px);
  object-fit: cover;
  object-position: top;
  border-radius: 0.5rem 0.5rem 0 0;
}
.image-box .draggable-image {
  width: 100%;
  height: calc(100% - 8px);
  object-fit: cover;
  object-position: top;
  border-radius: 0.5rem 0.5rem 0 0;
}
.image-label {
  position: absolute;
  bottom: 4px;
  left: 0;
  width: 100%;
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.8);
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0.2rem;
  z-index: 10;
}
.color-indicator {
  width: 100%;
  height: 4px;
  border-radius: 0 0 0.5rem 0.5rem;
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 10;
}
.color-indicator-pyramid {
  width: 100%;
  height: 4px;
  border-radius: 0 0 0.5rem 0.5rem;
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 10;
}
.selected {
  border-color: #00e8e0;
  box-shadow: 0 0 20px rgba(0, 232, 224, 0.8);
  animation: pulse-selected 2s infinite;
  transform: scale(1.05);
  z-index: 50;
}

@keyframes pulse-selected {
  0% { box-shadow: 0 0 10px rgba(0, 232, 224, 0.5); }
  50% { box-shadow: 0 0 25px rgba(0, 232, 224, 0.9), 0 0 40px rgba(0, 232, 224, 0.4); }
  100% { box-shadow: 0 0 10px rgba(0, 232, 224, 0.5); }
}

/* Step Guide Styles */
.step-guide-container {
  display: flex;
      margin-bottom: 10px; /* More space for the guide */

  justify-content: center;
  perspective: 1000px;
}

.step-guide {
  display: flex;
  align-items: center;
  background: rgba(30, 30, 30, 0.8);
  padding: 0.8rem 1.5rem;
  border-radius: 50px;
  border: 1px solid #333;
  backdrop-filter: blur(10px);
  gap: 1.5rem;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.step-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  transition: all 0.3s ease;
  opacity: 0.5;
  flex: 1;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #444;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 0.9rem;
  color: #fff;
  flex-shrink: 0;
}

.step-text {
  font-weight: 600;
  font-size: 0.95rem;
  white-space: nowrap;
  flex: 1;
}

.step-arrow {
  display: flex;
  align-items: center;
  opacity: 0.3;
  transition: transform 0.3s ease;
  transform: rotate(var(--arrow-rotation, 0deg));
}

.arrow-icon {
  font-size: 1rem;
  color: #00e8e0;
}

/* Step 1 Active */
.step-guide:not(.step-2-active):not(.step-3-active) .step-1 {
  opacity: 1;
  transform: scale(1.05);
}
.step-guide:not(.step-2-active):not(.step-3-active) .step-1 .step-number {
  background: #00e8e0;
  box-shadow: 0 0 15px rgba(0, 232, 224, 0.5);
}

/* Step 2 Active */
.step-2-active {
  border-color: #00e8e0;
  background: rgba(0, 232, 224, 0.1);
}

.step-2-active .step-2 {
  opacity: 1;
  transform: scale(1.05);
}

.step-2-active .step-2 .step-number {
  background: #c4ff00;
  color: #000;
  box-shadow: 0 0 15px rgba(196, 255, 0, 0.5);
}

.step-2-active .arrow-1 {
  opacity: 1;
  animation: slideArrow 1s infinite;
}

/* Step 3 Active */
.step-3-active {
  border-color: #c4ff00;
  background: rgba(196, 255, 0, 0.1);
}

.step-3-active .step-3 {
  opacity: 1;
  transform: scale(1.05);
}

.step-3-active .step-3 .step-number {
  background: #ffaa00;
  color: #000;
  box-shadow: 0 0 15px rgba(255, 170, 0, 0.5);
}

.step-3-active .arrow-2 {
  opacity: 1;
  animation: slideArrow 1s infinite;
}

/* Vote Pulse */
.pulse-vote {
  animation: pulseVote 2s infinite !important;
  transform: scale(1.05);
}

@keyframes pulseVote {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 232, 224, 0.7); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(0, 232, 224, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 232, 224, 0); }
}

@keyframes slideArrow {
  0% {
    transform: translateX(-5px) rotate(var(--arrow-rotation, 0deg));
    opacity: 0.3;
  }
  50% {
    transform: translateX(5px) rotate(var(--arrow-rotation, 0deg));
    opacity: 1;
  }
  100% {
    transform: translateX(-5px) rotate(var(--arrow-rotation, 0deg));
    opacity: 0.3;
  }
}

/* In RTL, because the container is rotated 180deg, 
   translateX(-5px) actually moves it visually to the Right, 
   and translateX(5px) to the Left. 
   Since Step 1 is on the Right and Step 2 is on the Left in RTL, 
   this animation naturally works as a slide from Right to Left. */

.highlight-empty .hex-border {
  background: linear-gradient(135deg, #00e8e0, #c4ff00);
  background-size: 200% 200%;
  animation: flowGradient 2s infinite, pulseHighlight 1s infinite alternate;
  z-index: 10;
}

@keyframes flowGradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes pulseHighlight {
  from { opacity: 0.4; filter: brightness(1); }
  to { opacity: 1; filter: brightness(1.5); box-shadow: 0 0 15px rgba(196, 255, 0, 0.3); }
}

/* Swap Indicator Logic */
.swap-badge-mobile {
  position: absolute;
  top: 50%;
  left: 50%;
  margin-top: -15px; /* Half of height to center */
  margin-left: -15px; /* Half of width to center */
  background: rgba(0, 0, 0, 0.7);
  color: #00e8e0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  z-index: 50;
  box-shadow: 0 0 15px rgba(0, 232, 224, 0.5);
  animation: rotateSwap 3s linear infinite;
  border: 1px solid #00e8e0;
  pointer-events: none;
}

@keyframes rotateSwap {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.selection-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-15deg);
  background: #00e8e0;
  color: #000;
  padding: 0.2rem 0.8rem;
  font-weight: 900;
  font-size: 0.8rem;
  text-transform: uppercase;
  border-radius: 4px;
  z-index: 30;
  box-shadow: 0 4px 10px rgba(0,0,0,0.5);
  pointer-events: none;
  border: 1px solid #fff;
}

@media screen and (max-width: 767px) {
  .step-guide {
    padding: 0.5rem 1rem;
    gap: 0.8rem;
    width: 95%;
  }
  .step-text {
    font-size: 0.8rem;
    white-space: normal;
    text-align: inherit;
    line-height: 1.2;
  }
  .step-item {
    gap: 0.5rem;
  }
  .step-number {
    width: 22px;
    height: 22px;
    font-size: 0.8rem;
    min-width: 22px;
  }
  .step-guide-container {
    margin-bottom: 20px; /* More space for the guide */
  }
  .step-guide {
    gap: 0.5rem;
    padding: 0.5rem 0.8rem;
  }
}

/* Pool Scroll Hint */
.pool-scroll-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem auto;
  padding: 0.8rem;
  background: rgba(196, 255, 0, 0.1);
  border: 1px dashed #c4ff00;
  border-radius: 12px;
  color: #c4ff00;
  font-weight: 700;
  cursor: pointer;
  animation: bounceHint 2s infinite;
  width: fit-content;
}

@keyframes bounceHint {
  0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
  40% {transform: translateY(-5px);}
  60% {transform: translateY(-3px);}
}

.hint-text {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.hint-icon {
  font-size: 1.2rem;
}

/* Slot Interaction */
.hex-outer:hover {
  transform: scale(1.02);
  filter: brightness(1.2);
}

.image-pool .pyramid-slot:hover {
  transform: translateY(-5px);
  border-color: #555;
  background: #252525;
}

.image-pool .pyramid-slot.selected:hover {
  transform: translateY(-5px) scale(1.05);
}


/* Hexagon Styles for Interactive Editor */
.hex-outer {
  width: 90px;
  height: 104px;
  position: relative;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: #1e1e1e;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hex-border {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: #00e8e0; /* Default cyan fallback */
  z-index: 1;
}
.hex-inner {
  width: calc(100% - 8px); /* Thicker border in editor */
  height: calc(100% - 8px);
  background: #0c0c0c;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  z-index: 2;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden !important;
}

.hex-outer.worst .hex-border {
  background: #ff5555;
}

.rank-tag {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 4px;
  border-radius: 2px;
  background: #00e8e0;
  z-index: 10;
  pointer-events: none;
  box-shadow: 0 0 5px rgba(0, 232, 224, 0.5);
}
.hex-outer.worst .rank-tag {
  background: #ff5555;
}

.pyramid-slot {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  margin: 0 !important;
  width: 95px; /* Slightly wider to match hex */
  overflow: hidden !important;
}
.pyramid-row {
  display: flex;
  justify-content: center;
  gap: 6px; /* Tighter horizontal gap */
}
@keyframes pulseHex {
  from { opacity: 0.3; }
  to { opacity: 1; }
}

@media screen and (max-width: 767px) {
  .hex-outer {
    width: 70px;
    height: 80px;
  }
}

.main-game-title {
  font-family: 'Outfit', 'Inter', sans-serif;
  font-size: 2.5rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 1rem 0 0.2rem;
  color: #fff;
  text-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  line-height: 1.1;
  padding-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.main-game-title :deep(span) {
  color: #00e8e0 !important;
}

.game-subtitle {
  font-size: 1.25rem;
  color: #00e8e0;
  letter-spacing: 2px;
  margin-bottom: 2rem;
  text-transform: uppercase;
  font-weight: 700;
  opacity: 0.9;
  line-height: 1.4;
}

.subtitle {
  color: #eee;
  font-size: 24px;
  font-weight: bold;
  margin: 0.3rem 0;
  text-align: center;
  margin-bottom: 8px !important;
}
.button.is-primary {
  margin: 1rem;
}
.info-icon {
  position: absolute;
  top: 2px;
  right: 2px;
  cursor: pointer;
  font-size: 0.8rem;
  color: #fff;
  background-color: #000;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 0 5px rgba(0,0,0,0.5);
}

.info-icon:hover {
  transform: scale(1.3);
  background-color: #00e8e0;
  color: #000;
  box-shadow: 0 0 10px rgba(0, 232, 224, 0.6);
}
.description-tab {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #1f1f1f;
  color: white;
  padding: 1rem;
  transform: translateY(100%);
  transition: transform 0.3s ease-in-out;
  z-index: 1000;
}
.description-tab.show {
  transform: translateY(0);
}
.tab-content {
  max-height: 200px;
  
  overflow-y: auto;
}
@media screen and (min-width: 768px) {
  .description-tab {
    width: 400px; /* Matches image-pool: 4 * 90px + 3 * 0.2rem + 2 * 0.3rem + 2px */
    left: 0;
    right: 0;
    margin-left: auto;
    margin-right: auto;
    transform: translateY(100%);
  }
  .description-tab.show {
    transform: translateY(0);
  }
}
.question-text {
  color: #00e8e0;
  font-weight: bold;
  margin-bottom: 0.5rem;
  text-align: center;
}
.answer-text {
  color: #eee;

}
 .info-icon.selected {
  color: #c4ff00;
  border: none !important;
}

.delete-icon {
  position: absolute;
  top: 2px;
  right: 26px;
  cursor: pointer;
  font-size: 0.8rem;
  color: #fff;
  background-color: #dc3545;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 0 5px rgba(0,0,0,0.5);
}

.delete-icon:hover {
  transform: scale(1.3);
  background-color: #c82333;
  color: #fff;
  box-shadow: 0 0 10px rgba(220, 53, 69, 0.6);
}
@media screen and (max-width: 767px) {
  .section {
    padding: 0.1rem 0;
  }
  .pyramid {
    width: 100%;
    padding: 0 4px;
  }
  .pyramid-row-container {
    width: 100%;
    margin-top: -20px;
  }
  .pyramid-row {
    gap: 2px;
  }
  .hex-outer {
    width: 23vw;
    height: 26.5vw;
    max-width: 88px;
    max-height: 102px;
  }
  .hex-inner {
    width: calc(100% - 4px);
    height: calc(100% - 4px);
  }
  .pyramid-slot {
    width: 23vw;
    height: 26.5vw;
    max-width: 88px;
    max-height: 102px;
    min-width: 0;
    min-height: 0;
    padding: 0 !important;
  }
  .slot-label-container {
    gap: 0.05rem;
  }
  .slot-points {
    font-size: 0.8rem;
  }
  .animation-container {
    right: -60px;
    width: 50px;
    height: 90px;
  }
  .animated-points {
    font-size: 1.4rem;
  }
  .worst-item-container {
    overflow-x: hidden;
  }
  .worst-item-container .subtitle {
    width: 100%;
    text-align: center;
  }
  .worst-row-wrapper {
    position: relative;
  }
  .worst-slot {
    width: 23vw;
    height: 26.5vw;
    max-width: 88px;
    max-height: 102px;
    min-width: 0;
    min-height: 0;
    padding: 0 !important;
    border: 2px solid #ff3333;
  }
  .worst-slot.drop-hover {
    border: 2px solid #ff3333;
  }
  .worst-slot-label-container {
    gap: 0.05rem;
  }
  .worst-slot-points {
    font-size: 0.8rem;
  }
  .worst-animation-container {
    right: -55px;
    width: 50px;
    height: 90px;
  }
  .pyramid-slot .draggable-image,
  .worst-slot .draggable-image {
    width: 100%;
    height: calc(100% - 4px);
    object-fit: cover;
    object-position: top;
    border-radius: 0.5rem 0.5rem 0 0;
  }
 
  .image-pool {
    grid-template-columns: repeat(3, 1fr);
    width: calc(100% - 30px);
    max-width: 380px;
    gap: 0;
    padding: 2px;
  }
  .image-box {
    width: 100% !important;
    height: 32vw;
    max-height: 140px;
    min-width: 0;
    max-width: none;
  }
  .image-label {
    font-size: 0.75rem;
    padding: 0.1rem;
  }
  .tier-label {
    font-size: 0.8rem;
  }
  .color-indicator {
    width: 100%;
    height: 4px;
    border-radius: 0 0 0.5rem 0.5rem;
    position: absolute;
    bottom: 0;
    left: 0;
    z-index: 10;
  }
  .color-indicator-pyramid {
    width: 100%;
    height: 4px;
    border-radius: 0 0 0.5rem 0.5rem;
    position: absolute;
    bottom: 0;
    left: 0;
    z-index: 10;
  }
 
}
.clear-link-wrapper {
  position: relative;
}
.confirm-tooltip {
  position: absolute;
  background-color: #2a2a2a;
  color: white;
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  z-index: 1000;
  width: 280px;
  text-align: center;
  top: calc(100% + 15px);
  left: 50%;
  transform: translateX(-50%);
  border: 1px solid #444;
}
.confirm-tooltip:before {
  content: "";
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid #444;
}
.confirm-tooltip:after {
  content: "";
  position: absolute;
  top: -9px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid #2a2a2a;
}
.buttons {
  justify-content: center;
  margin-top: 0.5rem;
}
@media screen and (max-width: 767px) {
  .confirm-tooltip {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 320px;
    box-shadow: 0 0 0 100vmax rgba(0,0,0,0.7), 0 10px 25px rgba(0,0,0,0.5);
  }
  .confirm-tooltip:before, .confirm-tooltip:after {
    display: none;
  }
}
.empty-community-message {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  width: 100%;
  min-height: 140px;
  grid-column: 1 / -1;
}

.image-pool {
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
  overflow-y: auto;
}

/* Remove Item Badge */
.remove-item-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.95);
  color: #ff3860;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  z-index: 60;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border: 1px solid #ff3860;
}

.remove-item-badge:hover {
  transform: translate(-50%, -50%) scale(1.15);
  background: #ff3860;
  color: white;
}

.remove-item-badge.danger {
  color: #fff;
  background: #ff3860;
  border-color: #fff;
}

/* Vote Button - Matching HeroSection btn-primary style */
.vote-button {
  position: relative;
  padding: 1rem 2rem;
  background: var(--color-primary);
  color: #000;
  font-weight: 700;
  font-size: 1.1rem;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
  min-width: 180px;
}

.vote-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 232, 224, 0.3);
}

.vote-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.vote-button .btn-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
}

.vote-button .btn-icon {
  transition: transform 0.2s ease;
}

.vote-button:hover:not(:disabled) .btn-icon {
  transform: translateX(4px);
}

.vote-button:hover:not(:disabled) .btn-icon.fa-flip-horizontal {
  transform: translateX(-4px);
}

.vote-button .btn-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
  transform: scale(0);
  transition: transform 0.4s ease;
  z-index: 1;
}

.vote-button:hover:not(:disabled) .btn-glow {
  transform: scale(1);
}

.vote-button.pulse-vote {
  background: linear-gradient(135deg, #00e8e0 0%, #c4ff00 100%);
  animation: pulseVoteAttractive 2s infinite;
}

@keyframes pulseVoteAttractive {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(196, 255, 0, 0.7); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(196, 255, 0, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(196, 255, 0, 0); }
}

.is-clickable {
  cursor: pointer;
}


/* Floating Info Button */
.pyramid-interactive-wrapper {
  position: relative;
  width: fit-content;
  margin: 0 auto;
}

.info-floating-button {
  position: absolute;
  top: 30px;
  left: 50%;
  transform: translateX(65px);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #00e8e0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 100;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  font-size: 1.25rem;
}

[dir="rtl"] .info-floating-button {
  left: auto;
  right: 50%;
  transform: translateX(-65px);
}

.info-floating-button:hover {
  /*background: #00e8e0;*/
 
  
  transform: translateX(65px) scale(2);
  border-color: #00e8e0;
}

[dir="rtl"] .info-floating-button:hover {
  transform: translateX(-65px) scale(1.1);
}

@media screen and (max-width: 767px) {
  .info-floating-button {
    top: 25px;
    transform: translateX(55px);
    width: 42px;
    height: 42px;
    font-size: 1.1rem;
  }
  [dir="rtl"] .info-floating-button {
    transform: translateX(-55px);
  }
  .info-floating-button:hover {
    transform: translateX(55px) scale(1.1);
  }
  [dir="rtl"] .info-floating-button:hover {
    transform: translateX(-55px) scale(1.1);
  }
}

/* Instructions Modal */
.instructions-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.instructions-modal {
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.instructions-modal-close {
  position: absolute;
  top: 1rem;
  inset-inline-end: 1rem;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 1;
}

.instructions-modal-close:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: #00e8e0;
  color: #00e8e0;
}

.instructions-modal-header {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.instructions-modal-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.5rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
}

.instructions-modal-title :deep(.fa-circle-info) {
  color: #00e8e0;
}

.instructions-modal-content {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.instructions-modal-text {
  color: #ccc;
  font-size: 1rem;
  line-height: 1.6;
}

.instructions-modal-text :deep(p) {
  margin-bottom: 0.75rem;
}

.instructions-modal-text :deep(p.empty-line) {
  margin-bottom: 0.5rem;
  min-height: 1em;
}

.instructions-modal-text :deep(strong) {
  font-weight: 700;
  color: #fff;
}

/* Enhanced markdown styles for pyramid instructions */
.instructions-modal-text :deep(h1),
.instructions-modal-text :deep(h2),
.instructions-modal-text :deep(h3),
.instructions-modal-text :deep(h4),
.instructions-modal-text :deep(h5),
.instructions-modal-text :deep(h6) {
  color: #fff;
  font-weight: 700;
  margin: 1rem 0 0.5rem 0;
  line-height: 1.2;
}

.instructions-modal-text :deep(h1) { font-size: 1.5rem; }
.instructions-modal-text :deep(h2) { font-size: 1.4rem; }
.instructions-modal-text :deep(h3) { font-size: 1.3rem; }
.instructions-modal-text :deep(h4) { font-size: 1.2rem; }
.instructions-modal-text :deep(h5) { font-size: 1.1rem; }
.instructions-modal-text :deep(h6) { font-size: 1rem; }

.instructions-modal-text :deep(blockquote) {
  border-left: 3px solid #00d1c9;
  padding-left: 0.75rem;
  margin: 0.75rem 0;
  font-style: italic;
  background: rgba(0, 209, 201, 0.1);
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
}

.instructions-modal-text :deep(ul),
.instructions-modal-text :deep(ol) {
  margin: 0.75rem 0;
  padding-left: 1.25rem;
}

.instructions-modal-text :deep(li) {
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.instructions-modal-text :deep(pre) {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 0.75rem;
  margin: 0.75rem 0;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  line-height: 1.4;
}

.instructions-modal-text :deep(code) {
  background: rgba(0, 0, 0, 0.3);
  padding: 0.15rem 0.3rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
}

.instructions-modal-text :deep(a) {
  color: #00d1c9;
  text-decoration: underline;
}

.instructions-modal-text :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 0.5rem 0;
}

.instructions-modal-text :deep(del) {
  text-decoration: line-through;
  opacity: 0.7;
}

/* Tables in pyramid instructions */
.instructions-modal-text :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  overflow: hidden;
}

.instructions-modal-text :deep(thead) {
  background: rgba(0, 209, 201, 0.1);
}

.instructions-modal-text :deep(th),
.instructions-modal-text :deep(td) {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.instructions-modal-text :deep(th) {
  font-weight: 600;
  color: #fff;
}

.instructions-modal-text :deep(td) {
  color: #ccc;
}

.instructions-modal-text :deep(tbody tr:hover) {
  background: rgba(255, 255, 255, 0.05);
}

@media screen and (max-width: 767px) {
  .instructions-modal {
    max-height: 90vh;
    border-radius: 16px;
  }
  .instructions-modal-header {
    padding: 1rem 1rem 0.75rem;
  }
  .instructions-modal-title {
    font-size: 1.25rem;
  }
  .instructions-modal-content {
    padding: 1rem;
  }
}

/* Community Item Modal */
.community-item-modal .modal-content {
  text-align: start !important;
  max-width: 500px;
}

.community-item-modal .field,
.community-item-modal .label,
.community-item-modal .help,
.community-item-modal .title {
  text-align: start !important;
}

.community-item-modal .buttons {
  justify-content: flex-start !important;
}

/* Delete Confirmation Dialog */
.delete-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.delete-confirm-dialog {
  background: #2a2a2a;
  color: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  max-width: 400px;
  width: 90%;
  text-align: center;
  border: 1px solid #444;
}

.delete-confirm-message {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #fff;
}

.delete-confirm-warning {
  font-size: 0.9rem;
  color: #ff6b6b;
  margin-bottom: 1.5rem;
}

.delete-confirm-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.delete-confirm-buttons .button {
  min-width: 80px;
}
</style>

