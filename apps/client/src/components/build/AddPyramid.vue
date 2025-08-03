<template>
  <div class="add-pyramid">
    <h3 class="title is-5 has-text-white">Items</h3>
    <div v-for="(item, idx) in localConfig.items" :key="idx" class="box">
      <div class="field is-horizontal">
        <div class="field-body">
          <div class="field"><input v-model="item.id" class="input" placeholder="ID" /></div>
          <div class="field"><input v-model="item.label" class="input" placeholder="Label" /></div>
          <div class="field"><input v-model="item.name" class="input" placeholder="Name" /></div>
        </div>
      </div>
      <div class="field is-horizontal">
        <div class="field-body">
          <div class="field"><input v-model="item.src" class="input" placeholder="Image URL" /></div>
          <div class="field"><input v-model="item.description" class="input" placeholder="Description" /></div>
        </div>
      </div>
      <div class="field is-horizontal">
        <div class="field-body">
          <div class="field"><input v-model="item.color" class="input" placeholder="Color" /></div>
          <div class="field"><input v-model="item.source" class="input" placeholder="Source" /></div>
          <div class="field"><label class="checkbox has-text-white"><input type="checkbox" v-model="item.active" /> Active</label></div>
          <div class="field"><button class="button is-danger is-small" @click="removeItem(idx)">Remove</button></div>
        </div>
      </div>
    </div>
    <button class="button is-link is-light mb-4" @click="addItem">Add Item</button>

    <h3 class="title is-5 has-text-white">Rows</h3>
    <div v-for="(row, idx) in localConfig.rows" :key="idx" class="box">
      <div class="field is-horizontal">
        <div class="field-body">
          <div class="field"><input type="number" v-model.number="row.id" class="input" placeholder="ID" /></div>
          <div class="field"><input v-model="row.label" class="input" placeholder="Label" /></div>
          <div class="field"><input type="number" v-model.number="row.points" class="input" placeholder="Points" /></div>
          <div class="field"><input v-model="row.color" class="input" placeholder="Color" /></div>
          <div class="field"><button class="button is-danger is-small" @click="removeRow(idx)">Remove</button></div>
        </div>
      </div>
    </div>
    <button class="button is-link is-light mb-4" @click="addRow">Add Row</button>

    <div class="field">
      <label class="checkbox has-text-white">
        <input type="checkbox" v-model="localConfig.HideRowLabel" />
        Hide Row Labels
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { PyramidConfig, PyramidItem, PyramidRow } from '@top-x/shared/types';

const props = defineProps<{ modelValue: PyramidConfig }>();
const emit = defineEmits(['update:modelValue']);

const localConfig = ref<PyramidConfig>({
  items: [],
  rows: [],
  sortItems: { orderBy: 'id', order: 'asc' },
  HideRowLabel: false,
  communityItems: [],
  ...props.modelValue,
});

watch(localConfig, (val) => emit('update:modelValue', val), { deep: true });

function addItem() {
  localConfig.value.items.push({ id: '', label: '', name: '', src: '', active: true, source: '' } as PyramidItem);
}
function removeItem(idx: number) {
  localConfig.value.items.splice(idx, 1);
}
function addRow() {
  localConfig.value.rows.push({ id: 0, label: '', points: 0 } as PyramidRow);
}
function removeRow(idx: number) {
  localConfig.value.rows.splice(idx, 1);
}
</script>

<style scoped>
.box { margin-bottom: 1rem; }
</style>
