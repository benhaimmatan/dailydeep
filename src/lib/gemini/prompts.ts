/**
 * Build the report generation prompt
 *
 * Creates a detailed prompt for Gemini to generate investigative reports
 * matching The Daily Deep's editorial standards.
 */
export function buildReportPrompt(topic: string, category: string, retryContext?: { attempt: number; previousWordCount: number }): string {
  const retryWarning = retryContext
    ? `\n\n⚠️ CRITICAL WARNING: Your previous attempt produced only ${retryContext.previousWordCount} words, which is ${1800 - retryContext.previousWordCount} words SHORT of the minimum. You MUST write significantly more content this time. This is attempt ${retryContext.attempt + 1}.\n`
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
- Describing data in prose when a chart or table would be clearer
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

### 5. Key Data (with visualizations)
Use Mermaid charts AND tables to present data visually. Include at least 2-3 visualizations.

### 6. The Debate (2-3 paragraphs)
Contrasting expert perspectives. Use direct quotes where possible. Name specific people.

### 7. Context & Background (2 paragraphs MAX)
Brief historical context—keep it tight. Assume readers have baseline knowledge.

### 8. What's Next (1-2 paragraphs)
Concrete upcoming milestones, decisions, or events to watch.

## MERMAID VISUALIZATIONS (REQUIRED)

Include **2-3 Mermaid charts** to visualize data instead of describing it in prose. Use charts instead of lengthy data descriptions.

**Bar Chart** - Use for comparisons (3-8 items):
\`\`\`mermaid
xychart-beta
    title "Defense Spending 2024"
    x-axis ["USA", "China", "Russia", "India"]
    y-axis "Billions USD" 0 --> 900
    bar [886, 292, 86, 83]
\`\`\`

**Pie Chart** - Use for parts of a whole:
\`\`\`mermaid
pie showData title "EV Market Share"
    "Tesla" : 19.5
    "BYD" : 17.1
    "Others" : 63.4
\`\`\`

**Timeline** - Use for historical context or sequences:
\`\`\`mermaid
timeline
    title Key Events
    2020 : Announcement
    2023 : Launch
    2024 : Expansion
\`\`\`

**Chart Selection Guide:**
| Data Type | Chart Type | When to Use |
|-----------|------------|-------------|
| Comparisons (3-8 items) | Bar (xychart-beta) | Budget by country, rankings |
| Parts of whole | Pie | Market share, breakdowns |
| Sequence/history | Timeline | Milestones, event chronology |

## LENGTH & FORMAT

- **Target: 2,000-2,500 words** (~10 minute read). Be concise—let charts do the talking.
- Use frequent subheadings (every 200-300 words) for skimmability
- Charts > tables > prose for data
- Short paragraphs (3-4 sentences max)
- Include **bold** for key terms and *emphasis* for important points

## DATA REQUIREMENTS

- Include specific numbers, dates, percentages throughout
- At least 2-3 Mermaid visualizations (bar charts, pie charts, or timelines)
- You may also include 1-2 markdown tables for detailed comparisons
- Reference credible sources (news outlets, official reports, academic papers)
- Minimum 5 cited sources

Write the report now. Be sharp, direct, and analytical.`;
}
