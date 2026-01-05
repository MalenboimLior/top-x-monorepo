<template>
  <Teleport to="body">
    <div v-if="userStore.showConflictModal" class="conflict-modal-overlay" @click="handleCancel">
      <div class="conflict-modal" @click.stop>
        <button class="conflict-modal-close" @click="handleCancel" :aria-label="t('common.close')">
          <font-awesome-icon :icon="['fas', 'xmark']" />
        </button>

        <div class="conflict-modal-header">
          <h3 class="conflict-modal-title">
            <font-awesome-icon :icon="['fas', 'triangle-exclamation']" class="warning-icon" />
            {{ t('auth.conflict.title') }}
          </h3>
        </div>

        <div class="conflict-modal-content">
          <p class="conflict-message">
            {{ t('auth.conflict.message') }}
          </p>
          
          <div class="conflict-actions">
            <CustomButton
              type="is-danger"
              :label="t('auth.conflict.confirm')"
              :icon="['fas', 'trash-can']"
              @click="handleConfirm"
            />
            <button class="cancel-button" @click="handleCancel">
              {{ t('auth.conflict.cancel') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user';
import { useLocaleStore } from '@/stores/locale';
import CustomButton from '@top-x/shared/components/CustomButton.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

const userStore = useUserStore();
const localeStore = useLocaleStore();
const t = (key: string) => localeStore.translate(key);

const handleConfirm = async () => {
  await userStore.resolveConflict(true);
};

const handleCancel = async () => {
  await userStore.resolveConflict(false);
};
</script>

<style scoped>
.conflict-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(8px);
}

.conflict-modal {
  background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
  border: 1px solid rgba(255, 51, 51, 0.3);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(255, 0, 0, 0.15);
  max-width: 500px;
  width: 90%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  animation: modal-appear 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modal-appear {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.conflict-modal-close {
  position: absolute;
  top: 16px;
  inset-inline-end: 16px;
  background: none;
  border: none;
  color: #888;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s;
  z-index: 1;
}

.conflict-modal-close:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.conflict-modal-header {
  padding: 32px 32px 16px;
  text-align: center;
}

.conflict-modal-title {
  color: #fff;
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.warning-icon {
  color: #ff3333;
  font-size: 2.5rem;
  filter: drop-shadow(0 0 10px rgba(255, 51, 51, 0.5));
}

.conflict-modal-content {
  padding: 0 32px 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.conflict-message {
  color: #ccc;
  line-height: 1.6;
  font-size: 1.05rem;
  text-align: center;
  margin: 0;
}

.conflict-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.cancel-button {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #888;
  padding: 12px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
}

/* RTL Support */
[dir="rtl"] .conflict-modal-title,
[dir="rtl"] .conflict-message {
  direction: rtl;
}
</style>
