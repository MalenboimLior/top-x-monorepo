<template>
  <div class="daily-challenges">
    <h2 class="title is-3 has-text-white">Daily Challenges</h2>
    <div class="columns is-multiline is-mobile">
      <div
        v-for="challenge in challenges"
        :key="challenge.id"
        class="column is-half-desktop is-half-tablet is-full-mobile is-clickable"
        @click="openChallenge(challenge.route)"
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
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { db, analytics, trackEvent } from '@top-x/shared'
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
    const gameDoc = await getDoc(doc(db, 'games', gameId.value))
    const gameTypeId = gameDoc.exists() ? (gameDoc.data() as any).gameTypeId || '' : ''
    const snapshot = await getDocs(collection(db, 'games', gameId.value, 'daily_challenges'))
    challenges.value = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      route: `/games/${gameTypeId}?game=${gameId.value}&challenge=${d.id}`,
    }))
  } catch (err) {
    console.error('Failed fetching challenges:', err)
  }
})

function openChallenge(route: string) {
  const idMatch = route.match(/game=([^&]+)/)
  const selectedGameId = idMatch ? idMatch[1] : 'unknown'
  trackEvent(analytics, 'select_game', { game_id: selectedGameId })
  router.push(route)
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

