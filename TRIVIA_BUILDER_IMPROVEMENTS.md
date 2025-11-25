# Trivia Builder Improvements - Options & Recommendations

## Current State
- Multi-step wizard: session → questions → theme
- Questions step shows list + preview side-by-side
- Many settings that confuse new users
- Users primarily care about questions

## Proposed Options

### Option 1: Questions-First, Scrollable Builder ⭐ RECOMMENDED
**Approach:**
- Start immediately with questions (no session/theme steps initially)
- All questions visible in a scrollable list
- Each question is a card that expands inline for editing
- Settings moved to a collapsible "Advanced Settings" section
- One-click "Add Question" button always visible
- Progress indicator: "X questions added"

**Pros:**
- Immediate focus on what matters (questions)
- See all questions at once
- Natural scroll flow
- Settings don't get in the way
- Fast question creation

**Cons:**
- Less structured than wizard
- Might feel overwhelming with many questions

---

### Option 2: One-Question-at-a-Time Focus Mode
**Approach:**
- Full-screen question editor
- One question visible at a time
- Next/Previous navigation
- Progress: "Question 3 of 10"
- Settings accessible via sidebar or bottom drawer

**Pros:**
- Zero distractions
- Perfect focus on current question
- Mobile-friendly
- Clear progress

**Cons:**
- Can't see all questions at once
- More clicks to navigate
- Harder to reorder

---

### Option 3: Hybrid - Questions List + Inline Editor
**Approach:**
- Questions list on left (compact cards)
- Full editor on right when question selected
- Settings in collapsible bottom section
- Quick actions: duplicate, delete, reorder

**Pros:**
- Best of both worlds
- See overview + detailed edit
- Easy reordering

**Cons:**
- Requires wider screen
- More complex layout

---

## Recommendation: Option 1 (Questions-First, Scrollable)

### Implementation Plan:

1. **Restructure AddTrivia.vue:**
   - Remove step-based navigation
   - Single scrollable page
   - Questions as expandable cards
   - Settings in collapsible section at bottom

2. **Update BuildAddNewGame.vue:**
   - Change trivia steps to single "Questions" step
   - Remove session/theme as separate steps
   - Add "Advanced Settings" button

3. **Default Configs:**
   - Add sample questions to default configs
   - Pre-populate with 3-5 example questions
   - Show in template selection

4. **UX Improvements:**
   - Auto-save as user types
   - Question validation (min 2 answers, correct answer selected)
   - Quick duplicate question
   - Bulk actions (delete multiple)

---

## Default Config Examples

### Quick Start Template
- 5 sample questions
- Unlimited lives
- Show correct answers
- Basic theme

### Challenge Template
- 10 sample questions
- 3 lives
- Timer enabled
- Power-ups enabled

### Casual Template
- 8 sample questions
- Unlimited lives
- No timer
- Simple theme

