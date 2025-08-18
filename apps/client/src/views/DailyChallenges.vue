<template>
  <div class="daily-challenges">
    <h2 class="title is-3 has-text-white">Daily Challenges</h2>
    <div class="columns is-multiline is-mobile">
      <div
        v-for="challenge in challenges"
        :key="challenge.id"
        class="column is-half-desktop is-half-tablet is-full-mobile is-clickable"
        @click="openChallenge(challenge.id)"
      >
        <Card>
          <div class="card-content">
            <h2 class="title is-4 has-text-white">{{ challenge.id }}</h2>
            <CustomButton type="is-primary mt-4" :label="'Play'" />
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@top-x/shared'
import Card from '@top-x/shared/components/Card.vue'
import CustomButton from '@top-x/shared/components/CustomButton.vue'
import { useHead } from '@vueuse/head'

const route = useRoute()
const router = useRouter()
const gameId = ref(route.query.game as string || '')
const challenges = ref<any[]>([])

useHead({ title: 'Daily Challenges' })

onMounted(async () => {
  if (!gameId.value) return
  try {
    const snapshot = await getDocs(collection(db, 'games', gameId.value, 'daily_challenges'))
    challenges.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (err) {
    console.error('Failed fetching challenges:', err)
  }
})

function openChallenge(id: string) {
  router.push(`/games/PyramidTier?game=${gameId.value}&challenge=${id}`)
}
</script>

<style scoped>
.daily-challenges {
  text-align: center;
}
.is-clickable {
  cursor: pointer;
}
</style>

