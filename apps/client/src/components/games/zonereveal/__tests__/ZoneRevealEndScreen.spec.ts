import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import ZoneRevealEndScreen from '../ZoneRevealEndScreen.vue'

const user = ref({
  uid: 'tester',
  displayName: 'Test User',
  photoURL: null,
})

const profile = ref<any>(null)
const loginWithX = vi.fn(async () => true)
const updateGameProgress = vi.fn(async () => undefined)

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    user,
    profile,
    loginWithX,
    updateGameProgress,
  }),
}))

describe('ZoneRevealEndScreen', () => {
  beforeEach(() => {
    user.value = {
      uid: 'tester',
      displayName: 'Test User',
      photoURL: null,
    }
    profile.value = {
      games: {
        ZoneReveal: {},
      },
    }
    loginWithX.mockClear()
    updateGameProgress.mockClear()
  })

  const baseProps = {
    score: 12345,
    gameId: 'test-game',
    revealAt: '',
    answerConfig: {
      solution: 'Jerusalem',
      accepted: [],
      image: '',
    },
    challengeContext: null,
  }

  it('displays the revealed solution when the challenge is revealed', async () => {
    const wrapper = mount(ZoneRevealEndScreen, {
      props: baseProps,
    })

    await flushPromises()

    expect(wrapper.find('.reveal-answer__text').text()).toContain('Jerusalem')
    expect(wrapper.text()).toContain('Answer is available! Submit to see how you compare.')
  })

  it('shows success messaging for a matched submission after reveal', async () => {
    profile.value = {
      games: {
        ZoneReveal: {
          'test-game': {
            score: 12000,
            streak: 0,
            custom: {
              originalAnswer: 'Jerusalem',
              normalizedAnswer: 'jerusalem',
              distance: 0,
              isMatch: true,
            },
          },
        },
      },
    }

    const wrapper = mount(ZoneRevealEndScreen, {
      props: baseProps,
    })

    await flushPromises()

    expect(wrapper.text()).toContain('You nailed it!')
    expect(wrapper.text()).toContain('Perfect match—spot on!')

    const button = wrapper.get('button.button.is-success')
    expect(button.element).toBeDisabled()
    expect(button.text()).toBe('Answer Locked')
  })

  it('shows miss messaging and distance for a mismatched submission', async () => {
    profile.value = {
      games: {
        ZoneReveal: {
          'test-game': {
            score: 12000,
            streak: 0,
            custom: {
              originalAnswer: 'Tel Aviv',
              normalizedAnswer: 'tel aviv',
              distance: 3,
              isMatch: false,
            },
          },
        },
      },
    }

    const wrapper = mount(ZoneRevealEndScreen, {
      props: baseProps,
    })

    await flushPromises()

    expect(wrapper.text()).toContain("Close! We didn't auto-accept that answer")
    expect(wrapper.text()).toContain('Edit distance from the accepted answer: 3')

    const button = wrapper.get('button.button.is-success')
    expect(button.element).toBeDisabled()
    expect(button.text()).toBe('Answer Locked')

    expect(wrapper.text()).toContain('This challenge has been revealed and your answer is locked.')
  })
})
