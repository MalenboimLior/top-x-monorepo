<template>
  <div class="page-container guidelines-page" dir="ltr">
    <section class="guidelines-hero">
      <div class="guidelines-hero__glow"></div>
      <div class="guidelines-hero__content">
        <p class="guidelines-hero__pill">Community Standards</p>
        <h1 class="guidelines-hero__title">Community Guidelines</h1>
        <p class="guidelines-hero__subtitle">
          Maintaining a pleasant, safe, fair, and enjoyable experience for all users
        </p>
        <p class="guidelines-hero__date">Last Updated: November 17, 2025</p>
      </div>
    </section>

    <section class="guidelines-body fade-in">
      <div class="guidelines-surface">
        <div class="guidelines-content">
          <p class="guidelines-intro">
            These Community Guidelines are designed to maintain a pleasant, safe, fair, and enjoyable experience for all users.
            Use of the site and any Top-X services constitutes full agreement to these rules, in addition to the Terms of Use, Privacy Policy, and the DMCA Notice & Takedown Policy.
          </p>

          <!-- Core Principles -->
          <div class="guidelines-section">
            <h2>1. Core Principles</h2>
            <ol class="principles-list">
              <li><strong>Mutual Respect</strong> – You may disagree with others, but you must always behave respectfully.</li>
              <li><strong>Transparency and Fairness</strong> – Do not mislead users, manipulate results, or harm fair competition.</li>
              <li><strong>Safety and Privacy</strong> – Do not reveal others' personal information and do not violate users' privacy.</li>
              <li><strong>Fair Play Environment</strong> – Top-X is a competitive platform, but fairness always comes first.</li>
            </ol>
          </div>

          <!-- Prohibited Content -->
          <div class="guidelines-section">
            <h2>2. Prohibited Content</h2>
            <p>The following types of content are strictly forbidden:</p>

            <h3>2.1 Offensive or Violent Content</h3>
            <ul>
              <li>Insults, slurs, harassment, shaming</li>
              <li>Racism, hate speech</li>
              <li>Encouragement of violence or self-harm</li>
            </ul>

            <h3>2.2 Sexual or Inappropriate Content</h3>
            <ul>
              <li>Pornography</li>
              <li>Sexual content involving minors</li>
              <li>Explicit sexual material or severe sexual innuendo</li>
            </ul>

            <h3>2.3 Illegal Content</h3>
            <ul>
              <li>Copyright-infringing materials</li>
              <li>Drugs, gambling, crime</li>
              <li>Impersonation or use of false identities</li>
            </ul>

            <h3>2.4 Privacy Violations</h3>
            <ul>
              <li>Posting someone else's personal information without consent</li>
              <li>Sharing names, images, or identifying details of others</li>
              <li>Publishing sensitive personal information</li>
            </ul>

            <h3>2.5 Misleading or Fraudulent Content</h3>
            <ul>
              <li>Manipulating game results</li>
              <li>Creating fake accounts</li>
              <li>Intentionally spreading false information (Fake News)</li>
            </ul>
          </div>

          <!-- Prohibited Behavior -->
          <div class="guidelines-section">
            <h2>3. Prohibited Behavior on the Platform</h2>
            <ol>
              <li>Using bots, automation, scrapers, or hacking tools</li>
              <li>Bypassing technical mechanisms or accessing the service by unauthorized means</li>
              <li>Manipulating votes, rankings, or results</li>
              <li>Harassing or stalking other users</li>
              <li>Any commercial use of the platform without permission</li>
              <li>Interfering with the functionality of the website, games, tools, or services</li>
            </ol>
          </div>

          <!-- User-Generated Content -->
          <div class="guidelines-section">
            <h2>4. User-Generated Content (UGC)</h2>
            <ol>
              <li>Any game, tool, ranking, list, image, text, or data you upload may be <strong>public</strong>.</li>
              <li>Top-X may remove any content at its sole discretion.</li>
              <li>Top-X may use UGC in accordance with the Terms of Use.</li>
              <li>
                It is forbidden to upload:
                <ul>
                  <li>Malicious code</li>
                  <li>Games or tools designed to deceive or cause harm</li>
                  <li>Content that infringes the rights of third parties</li>
                </ul>
              </li>
            </ol>
          </div>

          <!-- Reporting Violations -->
          <div class="guidelines-section highlight">
            <h2>5. Reporting Violations</h2>
            <p>
              You may report prohibited, offensive, copyright-infringing, or harmful content via email:
            </p>
            <p class="email-contact">
              📧 <a href="mailto:Requests@Top-X.co">Requests@Top-X.co</a>
            </p>
            <p>
              Top-X may remove content, restrict users, suspend accounts, block access, or take any appropriate action at its sole discretion.
            </p>
          </div>

          <!-- Enforcement -->
          <div class="guidelines-section">
            <h2>6. Enforcement</h2>
            <p>
              Top-X reserves the right to take any necessary action to protect the platform and its users, including:
            </p>
            <ul>
              <li>Deleting content</li>
              <li>Blocking or suspending accounts</li>
              <li>Removing permissions</li>
              <li>Reporting serious cases to authorities (including child safety concerns, violence, threats, terrorism, fraud)</li>
            </ul>
            <p>
              Top-X does not guarantee removal of content within any specific timeframe.
            </p>
          </div>

          <!-- Updates -->
          <div class="guidelines-section">
            <h2>7. Updates to These Guidelines</h2>
            <p>
              Top-X may update these Community Guidelines at any time.
              Updating the date at the top of this page constitutes sufficient notice.
              Continued use of the site constitutes full acceptance of the updated guidelines.
            </p>
          </div>

          <!-- Consent -->
          <div class="guidelines-section">
            <h2>8. Consent</h2>
            <p>By using the site and Top-X services, you declare:</p>
            <ul>
              <li>Full agreement to these Community Guidelines</li>
              <li>A commitment to act fairly</li>
              <li>A waiver of any claim regarding enforcement actions, content removal, or account restrictions</li>
            </ul>
          </div>
        </div>

        <div class="guidelines-footer">
          <CustomButton
            type="is-primary is-large"
            :label="t('games.backToHome')"
            @click="$router.push('/')"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@vueuse/head';
import { useLocaleStore } from '@/stores/locale';
import CustomButton from '@top-x/shared/components/CustomButton.vue';

const localeStore = useLocaleStore();
const t = (key: string, params?: Record<string, unknown>) => localeStore.translate(key, params);

useHead(() => ({
  title: 'Community Guidelines - TOP-X',
  meta: [
    {
      name: 'description',
      content: 'Community Guidelines for the TOP-X gaming platform. Learn about our standards for maintaining a safe, fair, and enjoyable experience for all users.',
    },
    {
      name: 'keywords',
      content: 'TOP-X guidelines, community standards, rules, policies',
    },
  ],
}));
</script>

<style scoped>
.guidelines-page {
  display: flex;
  flex-direction: column;
  gap: 4rem;
  direction: ltr;
  text-align: left;
}

.guidelines-hero {
  position: relative;
  overflow: hidden;
  padding: 6rem 1.5rem 5rem;
  display: flex;
  justify-content: center;
}

.guidelines-hero__glow {
  display: none;
}

.guidelines-hero__content {
  position: relative;
  width: min(960px, 100%);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
  align-items: center;
}

.guidelines-hero__pill {
  display: inline-flex;
  padding: 0.4rem 1.3rem;
  border-radius: 999px;
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  color: var(--bulma-primary);
  letter-spacing: 0.12em;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.85rem;
}

.guidelines-hero__title {
  font-size: clamp(2.5rem, 2vw + 2rem, 3.8rem);
  font-weight: 700;
  margin: 0;
}

.guidelines-hero__subtitle {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-text-secondary);
  max-width: 48ch;
}

.guidelines-hero__date {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-text-tertiary);
  font-style: italic;
}

.guidelines-body {
  padding: 0 1.5rem 4rem;
  display: flex;
  justify-content: center;
}

.guidelines-surface {
  width: min(960px, 100%);
  background-color: var(--color-bg-card);
  border-radius: 32px;
  border: 1px solid var(--color-border-base);
  padding: 3rem clamp(1.75rem, 3vw, 3rem);
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.guidelines-content {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  color: var(--color-text-primary);
  font-size: 1rem;
  line-height: 1.7;
}

.guidelines-intro {
  font-size: 1.05rem;
  color: var(--color-text-secondary);
  padding: 1.5rem;
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  border-radius: 16px;
  margin: 0;
}

.guidelines-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.guidelines-section h2 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  color: var(--color-text-primary);
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--color-border-base);
}

.guidelines-section h3 {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 1.5rem 0 0.75rem;
  color: var(--color-text-primary);
}

.guidelines-section p {
  margin: 0;
}

.guidelines-section ul,
.guidelines-section ol {
  margin: 0;
  padding-left: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.principles-list {
  gap: 1rem;
}

.guidelines-section ul li,
.guidelines-section ol li {
  line-height: 1.6;
}

.guidelines-section.highlight {
  background-color: var(--color-primary-bg);
  border: 1px solid var(--color-border-primary);
  border-radius: 16px;
  padding: 1.5rem;
}

.email-contact {
  font-size: 1.2rem;
  font-weight: 600;
  text-align: center;
  padding: 1rem 0;
}

.email-contact a {
  color: var(--bulma-primary);
  text-decoration: none;
}

.email-contact a:hover {
  text-decoration: underline;
}

.guidelines-footer {
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-base);
}

.fade-in {
  animation: fadeIn 1s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .guidelines-page {
    gap: 3rem;
  }

  .guidelines-hero {
    padding: 4.5rem 1rem 3.5rem;
  }

  .guidelines-surface {
    padding: 2.5rem 1.5rem;
  }

  .guidelines-section h2 {
    font-size: 1.5rem;
  }

  .guidelines-section h3 {
    font-size: 1.15rem;
  }
}
</style>

