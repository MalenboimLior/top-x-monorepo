<template>
  <div class="add-pyramid">
    <h3 class="title is-4">Pyramid Configuration</h3>

    <!-- Items list -->
    <div class="field">
      <label class="label">Items</label>
      <div v-for="(item, index) in config.items" :key="index" class="box mb-2">
        <div class="field is-horizontal">
          <div class="field-body columns is-multiline">
            <div class="column is-one-quarter">
              <input class="input" v-model="item.id" placeholder="ID" />
            </div>
            <div class="column is-one-quarter">
              <input class="input" v-model="item.label" placeholder="Label" />
            </div>
            <div class="column is-one-quarter">
              <input class="input" v-model="item.name" placeholder="Name" />
            </div>
            <div class="column is-one-quarter">
              <ImageUploader
                v-model="item.src"
                :uploadFolder="`pyramid/${validatedGameId}`"
                :cropWidth="250"
                :cropHeight="250"
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
      <label class="label">Rows</label>
      <div v-for="(row, index) in config.rows" :key="index" class="box mb-2">
        <div class="field is-horizontal">
          <div class="field-body columns is-multiline">
            <div class="column is-one-quarter">
              <input class="input" type="number" v-model.number="row.id" placeholder="ID" />
            </div>
            <div class="column is-one-quarter">
              <input class="input" v-model="row.label" placeholder="Label" />
            </div>
            <div class="column is-one-quarter">
              <input class="input" type="number" v-model.number="row.points" placeholder="Points" />
            </div>
            <div class="column is-one-quarter">
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
      <label class="label">Sort Items</label>
      <div class="columns">
        <div class="column">
          <div class="select is-fullwidth">
            <select v-model="config.sortItems.orderBy">
              <option value="id">ID</option>
              <option value="label">Label</option>
              <option value="color">Color</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
        <div class="column">
          <div class="select is-fullwidth">
            <select v-model="config.sortItems.order">
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="field">
      <label class="checkbox">
        <input type="checkbox" v-model="config.HideRowLabel" />
        Hide Row Label
      </label>
    </div>

    <div class="field">
      <label class="label">Share Image Title</label>
      <input class="input" v-model="config.shareImageTitle" placeholder="Enter title" />
    </div>

    <div class="field">
      <label class="label">Pool Header</label>
      <input class="input" v-model="config.poolHeader" placeholder="Enter pool header" />
    </div>

    <div class="field">
      <label class="label">Worst Header</label>
      <input class="input" v-model="config.worstHeader" placeholder="Enter worst header" />
    </div>

    <div class="field">
      <label class="label">Worst Points</label>
      <input class="input" type="number" v-model.number="config.worstPoints" placeholder="Enter points" />
    </div>

    <div class="field">
      <label class="checkbox">
        <input type="checkbox" v-model="config.worstShow" />
        Show Worst
      </label>
    </div>

    <!-- Community Items -->
    <div class="field">
      <label class="label">Community Items</label>
      <div v-for="(item, index) in config.communityItems" :key="index" class="box mb-2">
        <div class="field is-horizontal">
          <div class="field-body columns is-multiline">
            <div class="column is-one-quarter">
              <input class="input" v-model="item.id" placeholder="ID" />
            </div>
            <div class="column is-one-quarter">
              <input class="input" v-model="item.label" placeholder="Label" />
            </div>
            <div class="column is-one-quarter">
              <input class="input" v-model="item.name" placeholder="Name" />
            </div>
            <div class="column is-one-quarter">
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
      <label class="label">Community Header</label>
      <input class="input" v-model="config.communityHeader" placeholder="Enter community header" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import ImageUploader from '@top-x/shared/components/ImageUploader.vue';
import type { PyramidConfig } from '@top-x/shared/types/pyramid';

const props = defineProps<{
  modelValue: PyramidConfig;
  gameId?: string;
}>();
const emit = defineEmits(['update:modelValue']);

const emptyConfig = (): PyramidConfig => ({
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
});

const config = ref<PyramidConfig>(JSON.parse(JSON.stringify(props.modelValue || emptyConfig())));

const validatedGameId = computed(() => {
  const id = props.gameId || `temp-${Date.now()}`;
  return id.replace(/[\\/\\\\]/g, '');
});

watch(
  () => props.modelValue,
  (val) => {
    config.value = JSON.parse(JSON.stringify(val || emptyConfig()));
  },
  { deep: true },
);

watch(
  config,
  (val) => {
    emit('update:modelValue', JSON.parse(JSON.stringify(val)));
  },
  { deep: true },
);

function addItem() {
  config.value.items.push({ id: '', label: '', name: '', src: '' });
}

function removeItem(index: number) {
  config.value.items.splice(index, 1);
}

function addRow() {
  config.value.rows.push({ id: 0, label: '', points: 0, color: '' });
}

function removeRow(index: number) {
  config.value.rows.splice(index, 1);
}

function addCommunityItem() {
  config.value.communityItems?.push({ id: '', label: '', name: '', src: '' });
}

function removeCommunityItem(index: number) {
  config.value.communityItems?.splice(index, 1);
}
</script>

<style scoped>
.add-pyramid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.label {
  font-weight: 600;
}
</style>
