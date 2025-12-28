<template>
  <div class="modal" :class="{ 'is-active': isActive }">
    <div class="modal-background"></div>
    <div class="modal-content box has-background-dark has-text-white">
      <button class="delete is-large" aria-label="close" @click="close"></button>
      <h2 class="title has-text-white">Add New Item</h2>
      <div v-if="!userStore.user" class="mb-4">
        <p>Feeling sneaky? Logged-in users only for adding items. Sign in with X and unleash your picks! ⚡</p>
        <button class="button is-success" @click="handleLogin">Log in with X</button>
      </div>
      <div v-else>
        <!-- <div class="field">
          <label class="label has-text-white">Label</label>
          <div class="control">
            <input class="input is-dark" type="text" v-model="form.label" placeholder="Item label" />
          </div>
        </div> -->
        <div class="field">
          <label class="label has-text-white">Name</label>
          <div class="control">
            <input class="input is-dark" type="text" v-model="form.name" placeholder="Item name" />
          </div>
        </div>
       <div class="field">
          <label class="label has-text-white">What does Grok have to say about it?</label>
          <div class="control">
            <textarea class="textarea is-dark" v-model="form.description" placeholder="Item description"></textarea>
          </div>
        </div>
        <!-- Color Tag Selection -->
        <div v-if="colorTagsCount > 0" class="field">
          <label class="label has-text-white">Color Tag</label>
          <div v-if="colorTagsCount === 1" class="color-tag-single">
            <div class="color-tag-chip selected">
              <span class="color-tag-chip__preview" :style="{ backgroundColor: Object.values(props.colorsTag || {})[0] }"></span>
              <span class="color-tag-chip__label">{{ Object.keys(props.colorsTag || {})[0] }}</span>
            </div>
          </div>
          <div v-else class="color-tag-multiple">
            <div class="color-tag-chips">
              <div
                v-for="(color, label) in props.colorsTag"
                :key="label"
                class="color-tag-chip"
                :class="{ selected: form.color === color }"
                @click="form.color = color"
              >
                <span class="color-tag-chip__preview" :style="{ backgroundColor: color }"></span>
                <span class="color-tag-chip__label">{{ label }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="field">
          <label class="label has-text-white">Image</label>
          <div class="control">
            <input type="file" accept="image/*" @change="handleImageUpload" />
            <p v-if="imagePreview" class="mt-2">
              <img :src="imagePreview" alt="Image preview" style="max-width: 100px; max-height: 100px;" />
            </p>
          </div>
        </div>
        <!-- <div class="field">
          <label class="label has-text-white">Color</label>
          <div class="control">
            <input type="color" v-model="form.color" />
          </div>
        </div> -->
        <div class="buttons mt-4">
          <button class="button is-success" :disabled="!isFormValid || isSaving" @click="saveItem">
            <span v-if="isSaving">Saving...</span>
            <span v-else>Save</span>
          </button>
          <button class="button is-text has-text-white" @click="close">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useUserStore } from '@/stores/user';
import { addCommunityItem } from '@/services/pyramid';
import { PyramidItem } from '@top-x/shared/types/pyramid';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@top-x/shared';

const props = defineProps<{
  isActive: boolean;
  gameId: string;
  colorsTag?: { [label: string]: string };
}>();

const emit = defineEmits<{
  (e: 'add-item', item: PyramidItem): void;
  (e: 'close'): void;
}>();

const userStore = useUserStore();
const form = ref({
  label: '',
  name: '',
  description: '',
  color: '#9900ff',
  image: null as File | null,
});
const imagePreview = ref<string | null>(null);
const isSaving = ref(false);

const colorTagsCount = computed(() => {
  return props.colorsTag ? Object.keys(props.colorsTag).length : 0;
});

const isFormValid = computed(() => {
  return  form.value.name.trim() && form.value.image;
});

// Auto-assign color tag when there's only one
watch(() => [props.colorsTag, form.value.name], () => {
  if (colorTagsCount.value === 1 && form.value.name && !form.value.color) {
    const firstColor = Object.values(props.colorsTag || {})[0] as string;
    form.value.color = firstColor;
  }
}, { immediate: true });

async function handleLogin() {
  try {
    const success = await userStore.loginWithX();
    if (success) {
      console.log('PyramidAddItemPopup: Login successful');
      if (analytics) {
        logEvent(analytics, 'user_action', { action: 'login', method: 'x_auth', context: 'add_item_popup' });
      }
    } else {
      console.error('PyramidAddItemPopup: Login failed');
      alert('Failed to log in. Please try again.');
    }
  } catch (err: any) {
    console.error('PyramidAddItemPopup: Login error:', err.message);
    alert('Failed to log in. Please try again.');
  }
}

function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    form.value.image = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(form.value.image);
    console.log('PyramidAddItemPopup: Image selected:', form.value.image.name);
  }
}

async function saveItem() {
  if (!userStore.user || !props.gameId) {
    console.error('PyramidAddItemPopup: No user or gameId');
    alert('Please log in and ensure a game is selected.');
    return;
  }

  if (!form.value.image) {
    alert('Please select an image.');
    return;
  }

  isSaving.value = true;

  try {
    const result = await addCommunityItem({
      gameId: props.gameId,
      itemData: {
        name: form.value.name.trim(),
        description: form.value.description.trim(),
        color: form.value.color,
        userId: userStore.user.uid || 'anonymous',
        userDisplayName: userStore.user.displayName || 'anonymous',
      },
      imageFile: form.value.image,
    });

    if (result.error || !result.item) {
      console.error('PyramidAddItemPopup: Error adding item:', result.error);
      alert(result.error || 'Failed to save item. Please try again.');
      return;
    }

    console.log('PyramidAddItemPopup: Item added successfully:', result.item);

    if (analytics) {
      logEvent(analytics, 'user_action', {
        action: 'save_item',
        game_id: props.gameId,
        item_id: result.item.id,
      });
    }

    // Emit new item to parent
    emit('add-item', result.item);

    // Reset form
    form.value = {
      label: '',
      name: '',
      description: '',
      color: '#9900ff',
      image: null,
    };
    imagePreview.value = null;
  } catch (err: any) {
    console.error('PyramidAddItemPopup: Error saving item:', {
      message: err.message,
      code: err.code,
      details: err.details,
      stack: err.stack,
    });
    alert('Failed to save item. Please try again.');
  } finally {
    isSaving.value = false;
  }
}

function close() {
  console.log('PyramidAddItemPopup: Closing popup');
  form.value = {
    label: '',
    name: '',
    description: '',
    color: '#9900ff',
    image: null,
  };
  imagePreview.value = null;
  emit('close');
}
</script>

<style scoped>
.modal-content {
  max-width: 400px;
  padding: 2rem !important;
  border-radius: 8px;
}
.delete {
  position: absolute;
  top: 1rem;
  right: 1rem;
}
.buttons{
    justify-content:center;
}
.button.is-success {
  background-color: var(--bulma-success, #c4ff00);
  color: #000;
}
.button.is-text {
  text-decoration: underline;
}
.input.is-dark,
.textarea.is-dark {
  background-color: #2a2a2a;
  color: white;
  border-color: #444;
}
.label {
  color: white;
}

/* Color Tag Selection */
.color-tag-single,
.color-tag-multiple {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.color-tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.color-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-tag-chip:hover {
  background: #333;
  border-color: #555;
}

.color-tag-chip.selected {
  background: rgba(196, 255, 0, 0.2);
  border-color: #c4ff00;
}

.color-tag-chip__preview {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #444;
  flex-shrink: 0;
}

.color-tag-chip__label {
  font-size: 0.9rem;
  color: white;
}

@media (max-width: 768px) {
  .color-tag-chips {
    flex-direction: column;
  }
}
</style>
