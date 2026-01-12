<template>
  <div class="book-builder-view section pt-5">
    <div class="container">
      <!-- Header Section -->
      <div class="has-text-centered mb-6">
        <img src="@/assets/topx-logo.png" alt="Top-X" class="topx-logo mb-4" />
        <h1 class="title is-2 has-text-white">{{ t('books.title') }}</h1>
        <p class="subtitle is-5 has-text-grey-lighter">{{ t('books.subtitle') }}</p>
      </div>

      <div class="columns is-variable is-8">
        <!-- Search Column -->
        <div class="column is-7">
          <div class="glass-box p-5 mb-5">
            <h2 class="subtitle is-4 mb-4 has-text-white">1. {{ t('books.searchTitle') }}</h2>
            
            <div class="field">
              <div class="control has-icons-left" :class="{ 'is-loading': isSearching }">
                <input 
                  class="input is-medium is-rounded search-input" 
                  type="text" 
                  v-model="searchQuery"
                  :placeholder="t('books.searchPlaceholder')"
                >
                <span class="icon is-left">
                  <font-awesome-icon icon="search" />
                </span>
              </div>
            </div>

            <!-- Search Results -->
            <div class="search-results-container mt-5">
              <div v-if="isSearching" class="has-text-centered py-6">
                <progress class="progress is-small is-primary" max="100"></progress>
              </div>
              
              <div v-else-if="searchResults.length > 0">
                <div class="results-grid">
                  <div v-for="book in searchResults" :key="book.id" class="result-card glass-card">
                    <div class="card-image-wrapper">
                      <img 
                        v-if="book.volumeInfo.imageLinks?.thumbnail" 
                        :src="getBookImageUrl(book.volumeInfo.imageLinks.thumbnail, false)" 
                        :alt="book.volumeInfo.title"
                      >
                      <div v-else class="no-thumbnail">
                        <font-awesome-icon icon="book" size="1x" />
                      </div>
                    </div>
                    <div class="card-info">
                      <h3 class="book-title line-clamp-1">{{ book.volumeInfo.title }}</h3>
                      <p class="book-author line-clamp-1">{{ book.volumeInfo.authors?.join(', ') || 'Unknown' }}</p>
                      <button 
                        @click="addBook(book)" 
                        class="button is-mini is-primary is-rounded mt-1"
                        :disabled="isInList(book.id)"
                      >
                        <font-awesome-icon :icon="isInList(book.id) ? 'check' : 'plus'" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div class="is-flex is-justify-content-center is-align-items-center mt-5 search-pager">
                  <button 
                    @click="prevPage" 
                    class="button is-small is-primary is-outlined is-rounded mr-4"
                    :disabled="startIndex === 0 || isSearching"
                  >
                    <font-awesome-icon icon="chevron-left" class="mr-1" />
                    {{ t('books.prevPage') }}
                  </button>
                  <span class="has-text-grey-light">{{ Math.floor(startIndex / 10) + 1 }}</span>
                  <button 
                    @click="nextPage" 
                    class="button is-small is-primary is-outlined is-rounded ml-4"
                    :disabled="searchResults.length < 10 || isSearching"
                  >
                    {{ t('books.nextPage') }}
                    <font-awesome-icon icon="chevron-right" class="ml-1" />
                  </button>
                </div>
              </div>

              <div v-else-if="searchQuery.length >= 3" class="has-text-centered py-6">
                <p class="has-text-grey">{{ t('books.noResults') }}</p>
              </div>
              
              <div v-else-if="searchQuery.length > 0" class="has-text-centered py-6">
                <p class="has-text-grey">{{ t('books.keepTyping') }}</p>
              </div>

              <div v-else class="has-text-centered py-6">
                <p class="has-text-grey-light italic">{{ t('books.startSearching') }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- My List Column -->
        <div class="column is-5">
          <div class="glass-box p-5 sticky-sidebar">
            <div class="is-flex is-justify-content-between is-align-items-center mb-4">
              <h2 class="subtitle is-4 m-0 has-text-white">2. {{ t('books.myListTitle') }}</h2>
              <span class="tag is-primary is-rounded">{{ myList.length }}/10</span>
            </div>

            <div v-if="myList.length === 0" class="empty-list-state has-text-centered py-6">
              <p class="has-text-grey mb-4">{{ t('books.emptyList') }}</p>
              <button @click="generateTop10" class="button is-light is-rounded is-small" :disabled="isSearching || searchResults.length === 0">
                <span class="icon"><font-awesome-icon icon="magic" /></span>
                <span>{{ t('books.generateTop10') }}</span>
              </button>
            </div>

            <div v-else>
              <!-- Draggable List -->
              <VueDraggable 
                v-model="myList" 
                class="ranked-list"
                handle=".drag-handle"
                :animation="200"
              >
                <div v-for="(element, index) in myList" :key="element.id" class="ranked-item glass-card mb-2">
                  <div class="rank-number">{{ index + 1 }}</div>

                  <div class="item-thumbnail ml-2">
                    <img 
                      v-if="element.volumeInfo.imageLinks?.thumbnail" 
                      :src="getBookImageUrl(element.volumeInfo.imageLinks.thumbnail, false)" 
                      :alt="element.volumeInfo.title"
                    >
                  </div>

                  <div class="item-details ml-4">
                    <p class="item-title mb-1 line-clamp-1">{{ element.volumeInfo.title }}</p>
                    <p class="item-author line-clamp-1">{{ element.volumeInfo.authors?.join(', ') }}</p>
                  </div>

                  <div class="item-actions ml-auto">
                    <button 
                      @click="moveItem(index, 'up')" 
                      class="action-btn move-btn" 
                      :disabled="index === 0"
                      :title="t('books.moveUp')"
                    >
                      <font-awesome-icon icon="chevron-up" />
                    </button>
                    <button 
                      @click="moveItem(index, 'down')" 
                      class="action-btn move-btn" 
                      :disabled="index === myList.length - 1"
                      :title="t('books.moveDown')"
                    >
                      <font-awesome-icon icon="chevron-down" />
                    </button>
                    <span class="action-btn drag-handle">
                      <font-awesome-icon icon="grip-lines" />
                    </span>
                    <button @click="removeBook(element.id)" class="action-btn delete-btn" :title="t('books.remove')">
                      <font-awesome-icon icon="times" />
                    </button>
                  </div>
                </div>
              </VueDraggable>

              <div class="buttons mt-5">
                <button 
                  @click="shareList" 
                  class="button is-primary is-fullwidth is-medium is-rounded gradient-btn"
                  :class="{ 'is-loading': isSharing }"
                >
                  <span class="icon"><font-awesome-icon icon="share-nodes" /></span>
                  <span>{{ t('books.shareList') }}</span>
                </button>
                <button @click="myList = []" class="button is-text is-fullwidth has-text-grey-light is-small">
                  {{ t('books.clearList') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden Export Template (used by html2canvas) -->
    <div v-if="isExporting" class="export-container-wrapper">
      <div id="export-template" class="export-template" ref="exportTemplate">
        <div class="export-header">
          <img src="@/assets/topx-logo.png" class="export-logo">
          <h1 class="export-title">{{ t('books.exportTitle') }}</h1>
          <p class="export-subtitle">{{ t('books.exportSubtitle') }}</p>
        </div>

        <div class="export-grid">
          <div v-for="(book, index) in exportList" :key="book.id" class="export-item">
            <div class="export-rank">{{ index + 1 }}</div>
            <div class="export-book-card">
              <div class="export-thumbnail">
                 <img 
                  v-if="book.volumeInfo.imageLinks?.thumbnail" 
                  :src="getBookImageUrl(book.volumeInfo.imageLinks.thumbnail, true)" 
                  crossorigin="anonymous"
                >
              </div>
              <div class="export-info">
                <h3 class="export-book-title">{{ book.volumeInfo.title }}</h3>
                <p class="export-book-author">{{ book.volumeInfo.authors?.join(', ') }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="export-footer">
          <p>Created on <strong>Top-X.co</strong></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { debounce } from 'lodash';
import { VueDraggable } from 'vue-draggable-plus';
import html2canvas from 'html2canvas';
import { searchBooks, Book } from '@/services/books';
import { useLocaleStore } from '@/stores/locale';
import { getProxiedImageUrl } from '@/utils/imageProxy';

// Localization
const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

// Search State
const searchQuery = ref('');
const searchResults = ref<Book[]>([]);
const isSearching = ref(false);
const startIndex = ref(0);

// List State
const myList = ref<Book[]>([]);
const isSharing = ref(false);
const isExporting = ref(false);
const exportTemplate = ref<HTMLElement | null>(null);
const exportList = ref<Book[]>([]);

// Debounced Search
const performSearch = debounce(async (q: string) => {
  if (q.trim().length < 3) {
    searchResults.value = [];
    isSearching.value = false;
    return;
  }

  isSearching.value = true;
  startIndex.value = 0;
  try {
    const results = await searchBooks(q, 10, 0);
    searchResults.value = results;
  } catch (error) {
    console.error('Search error:', error);
  } finally {
    isSearching.value = false;
  }
}, 500);

const nextPage = async () => {
  if (isSearching.value || searchResults.value.length < 10) return;
  startIndex.value += 10;
  isSearching.value = true;
  try {
    const results = await searchBooks(searchQuery.value, 10, startIndex.value);
    searchResults.value = results;
    // Scroll to top of search results
    const container = document.querySelector('.search-results-container');
    if (container) container.scrollTop = 0;
  } catch (error) {
    console.error('Load more error:', error);
  } finally {
    isSearching.value = false;
  }
};

const prevPage = async () => {
  if (isSearching.value || startIndex.value === 0) return;
  startIndex.value = Math.max(0, startIndex.value - 10);
  isSearching.value = true;
  try {
    const results = await searchBooks(searchQuery.value, 10, startIndex.value);
    searchResults.value = results;
    const container = document.querySelector('.search-results-container');
    if (container) container.scrollTop = 0;
  } catch (error) {
    console.error('Prev page error:', error);
  } finally {
    isSearching.value = false;
  }
};

watch(searchQuery, (newVal) => {
  if (newVal.length >= 3) {
    isSearching.value = true;
    performSearch(newVal);
  } else {
    searchResults.value = [];
    isSearching.value = false;
  }
});

// List Management
const addBook = (book: Book) => {
  if (myList.value.length >= 10) return;
  if (!isInList(book.id)) {
    myList.value.push(book);
  }
};

const removeBook = (id: string) => {
  myList.value = myList.value.filter(b => b.id !== id);
};

const isInList = (id: string) => {
  return myList.value.some(b => b.id === id);
};

const moveItem = (index: number, direction: 'up' | 'down') => {
  const newIndex = direction === 'up' ? index - 1 : index + 1;
  if (newIndex < 0 || newIndex >= myList.value.length) return;
  
  const element = myList.value.splice(index, 1)[0];
  myList.value.splice(newIndex, 0, element);
};

const getBookImageUrl = (thumbnail?: string, shouldProxy = false): string => {
  if (!thumbnail) return '';
  const httpsUrl = thumbnail.replace('http:', 'https:');
  return shouldProxy ? getProxiedImageUrl(httpsUrl) : httpsUrl;
};

const generateTop10 = () => {
  if (searchResults.value.length > 0) {
    const toAdd = searchResults.value.slice(0, 10);
    myList.value = [...toAdd];
  }
};

// Image Export
const shareList = async () => {
  if (myList.value.length === 0) return;
  
  isSharing.value = true;
  isExporting.value = true;
  exportList.value = [...myList.value];
  
  // Wait for rendering
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (!exportTemplate.value) return;

  try {
    const canvas = await html2canvas(exportTemplate.value, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0c0c0c',
      logging: false,
    });
    
    const dataUrl = canvas.toDataURL('image/png');
    
    if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'top10-books.png', { type: 'image/png' });
      await navigator.share({
        files: [file],
        title: t('books.shareTitle'),
        text: t('books.shareText'),
      });
    } else {
      const link = document.createElement('a');
      link.download = 'top10-books.png';
      link.href = dataUrl;
      link.click();
    }
  } catch (error) {
    console.error('Export error:', error);
  } finally {
    isSharing.value = false;
    isExporting.value = false;
  }
};

onMounted(() => {
  // Add i18n keys if they don't exist (simulated for now, would typically be in locale files)
  // books.title, books.subtitle, etc.
});
</script>

<style scoped>
.book-builder-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
}

.glass-box {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.glass-card {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
}

.topx-logo {
  height: 40px;
}

.search-input {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.75rem;
}

.result-card {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
}

.card-image-wrapper {
  aspect-ratio: 2/3;
  background: #222;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-info {
  flex-grow: 1;
  text-align: center;
}

.book-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: white;
  margin-bottom: 0.15rem;
}

.book-author {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
}

.button.is-mini {
  height: 24px;
  width: 24px;
  padding: 0;
  font-size: 0.7rem;
}

.sticky-sidebar {
  position: sticky;
  top: 100px;
}

.ranked-list {
  max-height: 500px;
  overflow-y: auto;
  padding-right: 5px;
}

.ranked-item {
  display: flex;
  align-items: center;
  padding: 1.25rem;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.04);
}

.rank-number {
  font-weight: 800;
  font-size: 2.2rem;
  color: #00e5ff;
  min-width: 44px;
  text-align: left;
  line-height: 1;
}

.item-thumbnail {
  width: 50px;
  height: 75px;
  background: #222;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.item-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-details {
  flex-grow: 1;
  min-width: 0;
  text-align: left;
}

.item-title {
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
  line-height: 1.3;
}

.item-author {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
}

.item-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  margin-left: 0.5rem;
}

.action-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 4px;
  transition: all 0.2s;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover:not(:disabled) {
  color: white;
  transform: scale(1.1);
}

.move-btn:hover:not(:disabled) {
  color: #00e5ff;
}

.delete-btn:hover {
  color: #ff3860;
}

.action-btn:disabled {
  opacity: 0.1;
  cursor: not-allowed;
}

.drag-handle {
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.gradient-btn {
  background: linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%);
  border: none;
  font-weight: 700;
}

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Export Styles */
.export-container-wrapper {
  position: absolute;
  top: -9999px;
  left: -9999px;
}

.export-template {
  width: 800px;
  padding: 40px;
  background-color: #0c0c0c;
  background-image: radial-gradient(circle at top right, #1a1a2e 0%, #0c0c0c 70%);
  color: white;
  font-family: 'Inter', sans-serif;
}

.export-header {
  text-align: center;
  margin-bottom: 40px;
}

.export-logo {
  height: 50px;
  margin-bottom: 15px;
}

.export-title {
  font-size: 3rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.export-subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.7);
}

.export-grid {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.export-item {
  display: flex;
  align-items: center;
  gap: 20px;
}

.export-rank {
  font-size: 2.5rem;
  font-weight: 900;
  font-style: italic;
  color: #3a7bd5;
  width: 60px;
  text-align: center;
}

.export-book-card {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 15px;
  flex-grow: 1;
  gap: 20px;
}

.export-thumbnail {
  width: 70px;
  height: 100px;
  background: #222;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.export-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.export-info {
  flex-grow: 1;
}

.export-book-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 5px 0;
}

.export-book-author {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.export-footer {
  margin-top: 40px;
  text-align: center;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.4);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 20px;
}

@media screen and (max-width: 768px) {
  .results-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .sticky-sidebar {
    position: static;
  }
}
</style>
