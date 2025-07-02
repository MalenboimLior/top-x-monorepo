<!-- Interactive tier placement table -->
<script setup lang="ts">
import { ref } from 'vue'
const isDark = ref(false)
interface ImageItem {
  id: number
  label: string
  src: string
}

interface PyramidSlot {
  image: ImageItem | null
}

// const imagePool = ref<ImageItem[]>([
//   { id: 1, label: 'Alpha', src: 'https://pbs.twimg.com/profile_images/1887542954136424450/o-QnF6_R_400x400.jpg' },
//   { id: 2, label: 'Bravo', src: 'https://pbs.twimg.com/profile_images/1862417880374972416/a-K8yZqR_400x400.jpg' },
//   { id: 3, label: 'Charlie', src: 'https://pbs.twimg.com/profile_images/1909302363648638976/PNb-fJWI_400x400.jpg' },
//   { id: 4, label: 'Delta', src: 'https://pbs.twimg.com/profile_images/874276197357596672/kUuht00m_400x400.jpg' },
//   { id: 5, label: 'Echo', src: 'https://pbs.twimg.com/profile_images/1879013694367252480/Gxa-Pspq_400x400.jpg' },
//   { id: 6, label: 'Foxtrot', src: 'https://pbs.twimg.com/profile_images/1909302363648638976/PNb-fJWI_400x400.jpg' },
//   { id: 7, label: 'Golf', src: 'https://pbs.twimg.com/profile_images/1691358078531182592/88XuYtBp_400x400.jpg' },
//   { id: 8, label: 'Hotel', src: 'https://pbs.twimg.com/profile_images/1883872265449902080/BibrzbYp_400x400.jpg' },
// ])
const imagePool = ref<ImageItem[]>([
  { id: 1, label: 'ירושלים', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Emblem_of_Jerusalem.svg/60px-Emblem_of_Jerusalem.svg.png' },
  { id: 2, label: 'תל אביב-יפו', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Emblem_of_Tel_Aviv.svg/60px-Emblem_of_Tel_Aviv.svg.png' },
  { id: 3, label: 'חיפה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Coat_of_arms_of_Haifa.svg/60px-Coat_of_arms_of_Haifa.svg.png' },
  { id: 4, label: 'פתח תקווה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Coat_of_arms_of_Petah-Tiqua.svg/60px-Coat_of_arms_of_Petah-Tiqua.svg.png' },
  { id: 5, label: 'ראשון לציון', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Rishon_leZion_Coat_of_Arms.svg/60px-Rishon_leZion_Coat_of_Arms.svg.png' },
  { id: 6, label: 'נתניה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/NetanyaCoa.svg/60px-NetanyaCoa.svg.png' },
  { id: 7, label: 'בני ברק', src: 'https://upload.wikimedia.org/wikipedia/he/thumb/1/15/Bnei_Brak_COA.svg/60px-Bnei_Brak_COA.svg.png' },
  { id: 8, label: 'אשדוד', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/City_of_Ashdod%2C_Israel_%E2%80%94_60th_anniversary_logo_with_COA_%E2%80%94_colorful.svg/60px-City_of_Ashdod%2C_Israel_%E2%80%94_60th_anniversary_logo_with_COA_%E2%80%94_colorful.svg.png' },
  { id: 9, label: 'באר שבע', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Coat_of_arms_of_Beersheba.svg/60px-Coat_of_arms_of_Beersheba.svg.png' },
  { id: 10, label: 'חולון', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Coat_of_arms_of_Holon.svg/60px-Coat_of_arms_of_Holon.svg.png' },
  { id: 11, label: 'בית שמש', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Coat_of_arms_of_Beit_Shemesh.svg/60px-Coat_of_arms_of_Beit_Shemesh.svg.png' },
  { id: 12, label: 'רמת גן', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Coat_of_arms_of_Ramat_Gan.svg/60px-Coat_of_arms_of_Ramat_Gan.svg.png' },
  { id: 13, label: 'אשקלון', src: 'https://upload.wikimedia.org/wikipedia/he/thumb/c/cf/Ashkelon_COA.svg/60px-Ashkelon_COA.svg.png' },
  { id: 14, label: 'רחובות', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Rehovot_COA.svg/60px-Rehovot_COA.svg.png' },
  { id: 15, label: 'בת ים', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Coat_of_arms_of_Bat-Yam.svg/60px-Coat_of_arms_of_Bat-Yam.svg.png' },
  { id: 16, label: 'הרצליה', src: 'https://upload.wikimedia.org/wikipedia/he/thumb/f/fe/COA_of_Herzliya.svg/60px-COA_of_Herzliya.svg.png' },
  { id: 17, label: 'חדרה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Hadera_COA.png/60px-Hadera_COA.png' },
  { id: 18, label: 'מודיעין-מכבים-רעות', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Coat_of_arms_of_Modiin.svg/60px-Coat_of_arms_of_Modiin.svg.png' },
  { id: 19, label: 'כפר סבא', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Kfar_Saba_COA.svg/60px-Kfar_Saba_COA.svg.png' },
  { id: 20, label: 'לוד', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Coat_of_arms_of_Lod.svg/60px-Coat_of_arms_of_Lod.svg.png' },
  { id: 21, label: 'מודיעין עילית', src: 'https://upload.wikimedia.org/wikipedia/he/thumb/2/20/ModiinIlit.svg/60px-ModiinIlit.svg.png' },
   { id: 22, label: 'רמלה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Ramla_COA.png/60px-Ramla_COA.png' },
  { id: 23, label: 'רעננה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Raanana_COA.png/60px-Raanana_COA.png' },
  { id: 24, label: 'גבעתיים', src: 'https://upload.wikimedia.org/wikipedia/he/thumb/3/39/Givatayim_COA.svg/60px-Givatayim_COA.svg.png' },
  { id: 25, label: 'קריית אתא', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Coat_of_arms_of_Kiryat_Ata.svg/60px-Coat_of_arms_of_Kiryat_Ata.svg.png' },
  { id: 26, label: 'הוד השרון', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Hod_HaSharon_COA.png/60px-Hod_HaSharon_COA.png' },
  { id: 27, label: 'קריית ביאליק', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Kiryat_Bialik_COA.png/60px-Kiryat_Bialik_COA.png' },
  { id: 28, label: 'קריית אונו', src: 'https://upload.wikimedia.org/wikipedia/he/thumb/0/0e/Kiryat_Ono_COA.svg/60px-Kiryat_Ono_COA.svg.png' },
  { id: 29, label: 'קריית גת', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Kiryat_Gat_COA.png/60px-Kiryat_Gat_COA.png' },
  { id: 30, label: 'עכו', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Acre_COA.png/60px-Acre_COA.png' },
  { id: 31, label: 'נהריה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Nahariya_COA.png/60px-Nahariya_COA.png' },
  { id: 32, label: 'קריית מוצקין', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Kiryat_Motzkin_COA.png/60px-Kiryat_Motzkin_COA.png' },
  { id: 33, label: 'אילת', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Eilat_COA.png/60px-Eilat_COA.png' },
  { id: 34, label: 'צפת', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Safed_COA.png/60px-Safed_COA.png' },
  { id: 35, label: 'יבנה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Yavne_COA.png/60px-Yavne_COA.png' },
  { id: 36, label: 'דימונה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Dimona_COA.png/60px-Dimona_COA.png' },
  { id: 37, label: 'נתיבות', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Netivot_COA.png/60px-Netivot_COA.png' },
  { id: 38, label: 'אופקים', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Ofakim_COA.png/60px-Ofakim_COA.png' },
  { id: 39, label: 'נצרת', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Nazareth_COA.png/60px-Nazareth_COA.png' },
  { id: 40, label: 'קריית ים', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Kiryat_Yam_COA.png/60px-Kiryat_Yam_COA.png' },
  { id: 41, label: 'שדרות', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Sderot_COA.png/60px-Sderot_COA.png' },
  { id: 42, label: 'טבריה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Tiberias_COA.png/60px-Tiberias_COA.png' },
  { id: 43, label: 'נס ציונה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Ness_Ziona_COA.png/60px-Ness_Ziona_COA.png' },
  { id: 44, label: 'אלעד', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Elad_COA.png/60px-Elad_COA.png' },
  { id: 45, label: 'רמת השרון', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Ramat_HaSharon_COA.png/60px-Ramat_HaSharon_COA.png' },
  { id: 46, label: 'ביתר עילית', src: 'https://upload.wikimedia.org/wikipedia/he/thumb/c/c0/Beitar_Illit_COA.svg/60px-Beitar_Illit_COA.svg.png' },
  { id: 47, label: 'ערערה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Arara_COA.png/60px-Arara_COA.png' },
  { id: 48, label: 'נצרת עילית', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Nazareth_Illit_COA.png/60px-Nazareth_Illit_COA.png' },
  { id: 49, label: 'חצור הגלילית', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Hatzor_HaGlilit_COA.png/60px-Hatzor_HaGlilit_COA.png' },
  { id: 50, label: 'אור יהודה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Or_Yehuda_COA.png/60px-Or_Yehuda_COA.png' },
  { id: 51, label: 'באקה אל-גרבייה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Baqa_al-Gharbiyye_COA.png/60px-Baqa_al-Gharbiyye_COA.png' },
  { id: 52, label: 'שפרעם', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Shefar%27am_COA.png/60px-Shefar%27am_COA.png' },
  { id: 53, label: 'קריית טבעון', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Kiryat_Tiv%27on_COA.png/60px-Kiryat_Tiv%27on_COA.png' },
  { id: 54, label: 'מבשרת ציון', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Mevaseret_Zion_COA.png/60px-Mevaseret_Zion_COA.png' },
  { id: 55, label: 'זכרון יעקב', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Zikhron_Ya%27akov_COA.png/60px-Zikhron_Ya%27akov_COA.png' },
  { id: 56, label: 'קריית עקרון', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Kiryat_Ekron_COA.png/60px-Kiryat_Ekron_COA.png' },
  { id: 57, label: 'בית דגן', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Beit_Dagan_COA.png/60px-Beit_Dagan_COA.png' },
  { id: 58, label: 'גדרה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Gedera_COA.png/60px-Gedera_COA.png' },
  { id: 59, label: 'גן יבנה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Gan_Yavne_COA.png/60px-Gan_Yavne_COA.png' },
  { id: 60, label: 'שלומי', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Shlomi_COA.png/60px-Shlomi_COA.png' },
  { id: 61, label: 'אום אל-פחם', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Umm_al-Fahm_COA.svg/60px-Umm_al-Fahm_COA.svg.png' },
  { id: 62, label: 'יהוד-מונוסון', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Coat_of_arms_of_Yehud-Monosson_%28blue%29.svg/60px-Coat_of_arms_of_Yehud-Monosson_%28blue%29.svg.png' },
  { id: 63, label: 'טירת כרמל', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Coat_of_arms_of_Tirat_Karmel.svg/60px-Coat_of_arms_of_Tirat_Karmel.svg.png' },
  { id: 64, label: 'כפר יונה', src: 'https://upload.wikimedia.org/wikipedia/he/thumb/7/7e/Kfar_Yona_COA.png/60px-Kfar_Yona_COA.png' },
  { id: 65, label: 'גבעת שמואל', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Coat_of_Arms_of_Givat_Shmuel.svg/60px-Coat_of_Arms_of_Givat_Shmuel.svg.png' },
  { id: 66, label: 'ערד', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Coat_of_Arms_of_Arad.svg/60px-Coat_of_Arms_of_Arad.svg.png' },
  { id: 67, label: 'טירה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Coat_of_arms_of_Al-Tira_%28Israel%29.svg/60px-Coat_of_arms_of_Al-Tira_%28Israel%29.svg.png' },
  { id: 68, label: 'מגדל העמק', src: 'https://upload.wikimedia.org/wikipedia/he/thumb/b/bd/%D7%9C%D7%95%D7%92%D7%95_%D7%A8%D7%A9%D7%95%D7%AA.png/60px-%D7%9C%D7%95%D7%92%D7%95_%D7%A8%D7%A9%D7%95%D7%AA.png' },
  { id: 69, label: 'עראבה', src: 'https://upload.wikimedia.org/wikipedia/he/thumb/b/b8/Coat_of_arms_of_Arraba.png/60px-Coat_of_arms_of_Arraba.png' },
  { id: 70, label: 'קריית מלאכי', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Kiryat_Malachi_COA.png/60px-Kiryat_Malachi_COA.png' },
  { id: 71, label: 'כפר קאסם', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Coat_of_arms_of_Kfar_Kasem.svg/60px-Coat_of_arms_of_Kfar_Kasem.svg.png' },
  { id: 72, label: 'יקנעם עילית', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Coat_of_arms_of_Yoqneam.svg/60px-Coat_of_arms_of_Yoqneam.svg.png' },
  { id: 73, label: 'קלנסווה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Qalansawe_COA.png/60px-Qalansawe_COA.png' },
  { id: 74, label: 'גני תקווה', src: 'https://upload.wikimedia.org/wikipedia/he/thumb/3/34/%D7%9C%D7%95%D7%92%D7%95_%D7%92%D7%A0%D7%99_%D7%AA%D7%A7%D7%95%D7%95%D7%94.png/60px-%D7%9C%D7%95%D7%92%D7%95_%D7%92%D7%A0%D7%99_%D7%AA%D7%A7%D7%95%D7%95%D7%94.png' },
  { id: 75, label: 'מע\'אר', src: 'https://upload.wikimedia.org/wikipedia/he/thumb/5/50/Coat_of_Arms_of_Maghar.png/60px-Coat_of_Arms_of_Maghar.png' },
  { id: 76, label: 'נשר', src: 'https://upload.wikimedia.org/wikipedia/he/thumb/6/69/Nesher_COA.svg/60px-Nesher_COA.svg.png' },
  { id: 77, label: 'קריית שמונה', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Coat_of_arms_of_Kiryat_Shmona.png/60px-Coat_of_arms_of_Kiryat_Shmona.png' },
  { id: 78, label: 'מעלות-תרשיחא', src: 'https://upload.wikimedia.org/wikipedia/he/thumb/0/09/Maalot-logo.png/60px-Maalot-logo.png' },
  { id: 79, label: 'אור עקיבא', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/OR_Akiva_COA.png/60px-OR_Akiva_COA.png' },
  { id: 80, label: 'אריאל', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Coat_of_arms_of_Ariel.svg/60px-Coat_of_arms_of_Ariel.svg.png' },
  { id: 81, label: 'כפר קרע', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Kafr_Kara_COA.png/60px-Kafr_Kara_COA.png' },
  { id: 82, label: 'בית שאן', src: 'https://upload.wikimedia.org/wikipedia/he/thumb/7/77/BeitShean.png/60px-BeitShean.png' }
]);


const pyramid = ref<PyramidSlot[][]>([
  [{ image: null }],
  [{ image: null }, { image: null }],
  [{ image: null }, { image: null }, { image: null }],
  [{ image: null }, { image: null }, { image: null }, { image: null }],
])

const draggedItem = ref<ImageItem | null>(null)
const dropHoverRow = ref<number | null>(null)
const dropHoverCol = ref<number | null>(null)

function onDragStart(image: ImageItem) {
  draggedItem.value = image
}

function onDragOver(e: DragEvent) {
  const el = e.currentTarget as HTMLElement
  el.classList.add('drop-hover')
}

function onDragLeave(e: DragEvent) {
  const el = e.currentTarget as HTMLElement
  el.classList.remove('drop-hover')
}

function onTapSelect(image: ImageItem) {
  draggedItem.value = image
}

function onSlotClick(row: number, col: number) {
  const targetSlot = pyramid.value[row][col]
  const targetImage = targetSlot.image

  if (!draggedItem.value && targetImage) {
    draggedItem.value = targetImage
    return
  }

  if (!draggedItem.value) return

  const fromSlot = findSlotContaining(draggedItem.value.id)
  const fromInPool = imagePool.value.some(i => i.id === draggedItem.value!.id)

  if (targetImage) {
    if (fromInPool) {
      imagePool.value = imagePool.value.filter(i => i.id !== draggedItem.value!.id)
      imagePool.value.push(targetImage)
    } else if (fromSlot) {
      fromSlot.image = targetImage
    }
  } else if (!fromInPool && fromSlot) {
    fromSlot.image = null
  } else if (fromInPool) {
    imagePool.value = imagePool.value.filter(i => i.id !== draggedItem.value!.id)
  }

  targetSlot.image = draggedItem.value
  draggedItem.value = null
  dropHoverRow.value = null
  dropHoverCol.value = null
}

function onDropToSlot(row: number, col: number) {
  dropHoverRow.value = row
  dropHoverCol.value = col
  onSlotClick(row, col)
}

function onDropToPool() {
  if (!draggedItem.value) return
  const slot = findSlotContaining(draggedItem.value.id)
  if (slot) slot.image = null
  if (!imagePool.value.some(i => i.id === draggedItem.value!.id)) {
    imagePool.value.push(draggedItem.value)
  }
  draggedItem.value = null
}

function onTapReturnToPool() {
  if (!draggedItem.value) return
  const slot = findSlotContaining(draggedItem.value.id)
  if (slot) slot.image = null
  if (!imagePool.value.some(i => i.id === draggedItem.value!.id)) {
    imagePool.value.push(draggedItem.value)
  }
  draggedItem.value = null
}

function findSlotContaining(imageId: number): PyramidSlot | null {
  for (const row of pyramid.value) {
    for (const slot of row) {
      if (slot.image?.id === imageId) {
        return slot
      }
    }
  }
  return null
}

function toRoman(num: number): string {
  const numerals = ['I', 'II', 'III', 'IV']
  return numerals[num - 1] || `${num}`
}
</script>
<template>
  <section class="section">
    <div class="container has-text-centered">
      <h1 class="title">Pyramid Tier Table</h1>

      <div class="theme-toggle">
        <button class="button is-small" @click="isDark = !isDark">
          Toggle {{ isDark ? 'Light' : 'Dark' }} Mode
        </button>
      </div>

      <div class="pyramid" :class="{ dark: isDark }">
        <div v-for="(row, rowIndex) in pyramid" :key="rowIndex" class="pyramid-row">
          <div
            v-for="(slot, colIndex) in row"
            :key="colIndex"
            class="pyramid-slot box"
            @dragover.prevent="onDragOver($event)"
            @dragleave="onDragLeave($event)"
            @drop="() => onDropToSlot(rowIndex, colIndex)"
            @click="onSlotClick(rowIndex, colIndex)"
            :class="[
              { selected: slot.image && draggedItem?.id === slot.image?.id },
              { 'highlight-empty': draggedItem && !slot.image },
              { 'drop-hover': dropHoverRow === rowIndex && dropHoverCol === colIndex },
              isDark ? 'dark-slot' : ''
            ]"
          >
            <div v-if="slot.image" class="draggable-item slot-style">
              <img :src="slot.image.src" class="draggable-image" />
              <div class="image-label">{{ slot.image.label }}</div>
            </div>
            <div v-else class="tier-label">{{ toRoman(rowIndex + 1) }}</div>
          </div>
        </div>
      </div>

      <h2 class="subtitle mt-6">Image Pool</h2>
      <div
        class="image-pool drop-zone"
        :class="{ dark: isDark }"
        @dragover.prevent
        @drop="onDropToPool"
        @click="onTapReturnToPool"
      >
        <div
          v-for="image in imagePool"
          :key="image.id"
          class="pyramid-slot image-box slot-style"
          draggable="true"
          @dragstart="() => onDragStart(image)"
          @click.stop="() => onTapSelect(image)"
          :class="[ { selected: draggedItem?.id === image.id }, isDark ? 'dark-slot' : '' ]"
        >
          <img :src="image.src" class="draggable-image" />
          <div class="image-label">{{ image.label }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.theme-toggle {
  margin-bottom: 1rem;
  text-align: right;
}
.dark {
  background-color: #000000;

  color: #eee;
}
.dark-slot {
  background-color: #1f1f1f !important;
  border-color: #444 !important;
}
.pyramid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}
.pyramid-row {
  display: flex;
  justify-content: center;
  margin: 0.05rem 0;
  gap: 0.2rem;
  min-height: 100px;
}
.pyramid-slot {
  width: 100px;
  height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border: 1px dashed #ccc;
  cursor: pointer;
  padding: 0.25rem;
  transition: background-color 0.2s, transform 0.2s;
  position: relative;
  border-radius: 0.75rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
  text-align: center;
  overflow: hidden;
  margin-bottom: 0px;
}
.pyramid-slot.drop-hover {
  background-color: #def0ff;
  transform: scale(1.05);
  border-color: #3298dc;
}
.tier-label {
  color: #bbb;
  font-size: 1.2rem;
  font-weight: bold;
  pointer-events: none;
}
.image-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  border: 2px dashed #999;
  padding: 1rem;
  margin-top: 1rem;
  min-height: 140px;
  background-color: #fff;
}
.image-box {
  padding: 0;
}
.slot-style {
  width: 100px;
  height: 100px;
  border-radius: 0.75rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
  background: linear-gradient(to bottom, #ffffff, #f1f1f1);
  border: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.draggable-image {
  max-width: 80%;
  max-height: 60px;
  user-select: none;
  touch-action: none;
  transition: transform 0.2s ease;
}
.image-label {
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 0.2rem;
  color: #333;
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 0.2rem;
}
.selected {
  border: 2px solid #3273dc;
  box-shadow: 0 0 0 2px #3273dc33;
}
.highlight-empty {
  background-color: #e7ff99;
  border-color: #e7ff99;
  animation: pulse 1s infinite alternate;
}
@keyframes pulse {
  from { box-shadow: 0 0 0 0 rgba(255, 211, 92, 0.6); }
  to { box-shadow: 0 0 0 8px rgba(255, 211, 92, 0); }
}
</style>
