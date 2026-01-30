/**
 * Build the report generation prompt
 *
 * Creates a detailed prompt for Gemini to generate investigative reports
 * matching The Daily Deep's editorial standards.
 */
export function buildReportPrompt(topic: string, category: string, retryContext?: { attempt: number; previousWordCount: number }): string {
  const retryWarning = retryContext
    ? `\n\n⚠️ CRITICAL WARNING: Your previous attempt produced only ${retryContext.previousWordCount} words, which is ${2500 - retryContext.previousWordCount} words SHORT of the minimum. You MUST write significantly more content this time. This is attempt ${retryContext.attempt + 1}.\n`
    : '';

  return `You are a senior investigative journalist writing for The Daily Deep. Your writing style is sharp, direct, and analytical—like The Economist meets ProPublica.
${retryWarning}
Write an investigative report on: "${topic}"

Category: ${category}

## WRITING STYLE (CRITICAL)

**Voice & Tone:**
- Use ACTIVE voice, not passive. Write "NASA delayed the mission" not "The mission was delayed by NASA"
- Be DIRECT. Write "NASA's backbone is international" not "NASA has forged significant partnerships"
- Sound like a journalist, not an academic. Avoid bureaucratic language
- Humanize the story—include specific people, quotes, concrete details

**What to AVOID:**
- Passive constructions ("it has been observed that...")
- Vague hedging ("it could potentially be argued...")
- Redundant history most readers already know
- Describing data in prose when a table would be clearer
- Repeating information across sections

## STRUCTURE: INVERTED PYRAMID

Front-load the most important information. Readers should get the key takeaway in the first 30 seconds.

**Required sections in this order:**

### 1. Quick Facts Box (Start with this)
A bulleted TL;DR with 4-5 key facts/numbers. Example format:
- **The Stakes:** [One sentence on why this matters]
- **Key Number:** [Most striking statistic]
- **Timeline:** [Critical date or deadline]
- **The Tension:** [Core conflict or challenge]

### 2. The Bottom Line (1 paragraph)
What's the single most important thing the reader needs to know? Lead with this.

### 3. Why This Matters Now (2-3 paragraphs)
The "so what" factor—geopolitical, economic, or societal implications. Don't bury this at the end.

### 4. The Current Situation (3-4 paragraphs)
Recent developments, key players, what's happening RIGHT NOW. Integrate technical details here—don't have a separate "technology" section.

### 5. Key Data (with tables)
Let numbers speak for themselves. Include at least 2-3 comparison tables. Example:
| Factor | Option A | Option B | Option C |
|--------|----------|----------|----------|
| Cost   | $X       | $Y       | $Z       |

### 6. The Debate (2-3 paragraphs)
Contrasting expert perspectives. Use direct quotes where possible. Name specific people.

### 7. Context & Background (2 paragraphs MAX)
Brief historical context—keep it tight. Assume readers have baseline knowledge. A timeline table is better than narrative prose for history.

### 8. What's Next (1-2 paragraphs)
Concrete upcoming milestones, decisions, or events to watch.

## LENGTH & FORMAT

- **Target: 3,000-3,500 words** (~15 minute read). Quality over quantity.
- Use frequent subheadings (every 200-300 words) for skimmability
- Tables > prose for data comparisons
- Short paragraphs (3-4 sentences max)
- Include **bold** for key terms and *emphasis* for important points

## DATA REQUIREMENTS

- Include specific numbers, dates, percentages throughout
- At least 3 data tables (comparison tables are most valuable)
- Reference credible sources (news outlets, official reports, academic papers)
- Minimum 5 cited sources

Write the report now. Be sharp, direct, and analytical.`;
}
