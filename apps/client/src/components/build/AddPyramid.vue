<template>
  <div class="add-pyramid">
    <h3 class="title is-4 has-text-white">Pyramid Configuration</h3>

    <!-- Items list -->
    <div class="field">
      <label class="label has-text-white">Items</label>
      <div v-for="(item, index) in config.items" :key="index" class="box mb-2">
        <div class="field is-horizontal">
          <div class="field-body columns">
            <div class="column">
              <input class="input" v-model="item.id" placeholder="ID" />
            </div>
            <div class="column">
              <input class="input" v-model="item.label" placeholder="Label" />
            </div>
            <div class="column">
              <input class="input" v-model="item.name" placeholder="Name" />
            </div>
            <div class="column">
              <ImageUploader
                v-model="item.src"
                :uploadFolder="`pyramid/${validatedGameId}`"
                :cropWidth="200"
                :cropHeight="200"
              />
            </div>
            <div class="column is-narrow">
              <button class="button is-danger" @click="removeItem(index)">Remove</button>
            </div>
          </div>
        </div>
      </div>
      <CustomButton type="is-success" label="Add Item" @click="addItem" />
    </div>

    <!-- Rows list -->
    <div class="field">
      <label class="label has-text-white">Rows</label>
      <div v-for="(row, index) in config.rows" :key="index" class="box mb-2">
        <div class="field is-horizontal">
          <div class="field-body columns">
            <div class="column">
              <input class="input" type="number" v-model="row.id" placeholder="ID" />
            </div>
            <div class="column">
              <input class="input" v-model="row.label" placeholder="Label" />
            </div>
            <div class="column">
              <input class="input" type="number" v-model="row.points" placeholder="Points" />
            </div>
            <div class="column">
              <input class="input" v-model="row.color" placeholder="Color" />
            </div>
            <div class="column is-narrow">
              <button class="button is-danger" @click="removeRow(index)">Remove</button>
            </div>
          </div>
        </div>
      </div>
      <CustomButton type="is-success" label="Add Row" @click="addRow" />
    </div>

    <!-- Sort Options -->
    <div class="field">
      <label class="label has-text-white">Sort Items</label>
      <div class="columns">
        <div class="column">
          <div class="select">
            <select v-model="config.sortItems.orderBy">
              <option value="id">ID</option>
              <option value="label">Label</option>
              <option value="color">Color</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
        <div class="column">
          <div class="select">
            <select v-model="config.sortItems.order">
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="field">
      <label class="checkbox has-text-white">
        <input type="checkbox" v-model="config.HideRowLabel" />
        Hide Row Label
      </label>
    </div>

    <div class="field">
      <label class="label has-text-white">Share Image Title</label>
      <input class="input" v-model="config.shareImageTitle" placeholder="Enter title" />
    </div>

    <div class="field">
      <label class="label has-text-white">Pool Header</label>
      <input class="input" v-model="config.poolHeader" placeholder="Enter pool header" />
    </div>

    <div class="field">
      <label class="label has-text-white">Worst Header</label>
      <input class="input" v-model="config.worstHeader" placeholder="Enter worst header" />
    </div>

    <div class="field">
      <label class="label has-text-white">Worst Points</label>
      <input class="input" type="number" v-model="config.worstPoints" placeholder="Enter points" />
    </div>

    <div class="field">
      <label class="checkbox has-text-white">
        <input type="checkbox" v-model="config.worstShow" />
        Show Worst
      </label>
    </div>

    <!-- Community Items -->
    <div class="field">
      <label class="label has-text-white">Community Items</label>
      <div v-for="(item, index) in config.communityItems" :key="index" class="box mb-2">
        <div class="field is-horizontal">
          <div class="field-body columns">
            <div class="column">
              <input class="input" v-model="item.id" placeholder="ID" />
            </div>
            <div class="column">
              <input class="input" v-model="item.label" placeholder="Label" />
            </div>
            <div class="column">
              <input class="input" v-model="item.name" placeholder="Name" />
            </div>
            <div class="column">
              <ImageUploader
                v-model="item.src"
                :uploadFolder="`pyramid/${validatedGameId}`"
                :cropWidth="200"
                :cropHeight="200"
              />
            </div>
            <div class="column is-narrow">
              <button class="button is-danger" @click="removeCommunityItem(index)">Remove</button>
            </div>
          </div>
        </div>
      </div>
      <CustomButton type="is-success" label="Add Community Item" @click="addCommunityItem" />
    </div>

    <div class="field">
      <label class="label has-text-white">Community Header</label>
      <input class="input" v-model="config.communityHeader" placeholder="Enter community header" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import ImageUploader from '@top-x/shared/components/ImageUploader.vue';
import type { PyramidConfig, PyramidItem, PyramidRow } from '@top-x/shared/types/pyramid';

// Deep equality check to avoid unnecessary emissions
function isEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const props = defineProps<{
  modelValue: PyramidConfig;
  gameId?: string;
}>();
const emit = defineEmits(['update:modelValue']);

// Initialize config with a deep clone of modelValue
const config = ref<PyramidConfig>(JSON.parse(JSON.stringify(props.modelValue || {
  items: [],
  rows: [],
  sortItems: { orderBy: 'id', order: 'asc' },
  HideRowLabel: false,
  shareImageTitle: '',
  poolHeader: '',
  worstHeader: '',
  worstPoints: 0,
  worstShow: false,
  communityItems: [],
  communityHeader: '',
})));

// Validate gameId to ensure safe uploadFolder path
const validatedGameId = computed(() => {
  const id = props.gameId || `temp-${Date.now()}`;
  return id.replace(/[\/\\]/g, '');
});

// Watch modelValue for changes and update config
watch(() => props.modelValue, (newVal) => {
  if (newVal && !isEqual(newVal, config.value)) {
    console.log('AddPyramid: modelValue changed, updating config', newVal);
    config.value = JSON.parse(JSON.stringify(newVal));
  }
}, { deep: true });

// Watch config for changes and emit update:modelValue only if different
watch(config, (newVal) => {
  if (!isEqual(newVal, props.modelValue)) {
    console.log('AddPyramid: config changed, emitting update:modelValue', newVal);
    emit('update:modelValue', JSON.parse(JSON.stringify(newVal)));
  }
}, { deep: true });

// Debug initial load
onMounted(() => {
  console.log('AddPyramid: Mounted with modelValue:', props.modelValue);
  console.log('AddPyramid: Initial config:', config.value);
});

function addItem() {
  config.value.items.push({ id: '', label: '', name: '', src: '', active: true, source: '' });
}

function removeItem(index: number) {
  config.value.items.splice(index, 1);
}

function addRow() {
  config.value.rows.push({ id: 0, label: '', points: 0 });
}

function removeRow(index: number) {
  config.value.rows.splice(index, 1);
}

function addCommunityItem() {
  config.value.communityItems.push({ id: '', label: '', name: '', src: '', active: true, source: '' });
}

function removeCommunityItem(index: number) {
  config.value.communityItems.splice(index, 1);
}
</script>

<style scoped>
.add-pyramid {
  margin-top: 1rem;
}
</style>