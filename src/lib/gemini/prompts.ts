/**
 * Retry context for content quality issues
 */
interface RetryContext {
  attempt: number;
  previousWordCount?: number;
  chartErrors?: string[];
}

/**
 * Build the report generation prompt
 *
 * Creates a detailed prompt for Gemini to generate investigative reports
 * matching The Daily Deep's editorial standards.
 */
export function buildReportPrompt(topic: string, category: string, retryContext?: RetryContext): string {
  let retryWarning = '';

  if (retryContext) {
    const parts: string[] = [];
    parts.push(`⚠️ CRITICAL WARNING: This is attempt ${retryContext.attempt + 1}. Your previous attempt had issues:`);

    if (retryContext.previousWordCount && retryContext.previousWordCount < 1800) {
      parts.push(`- Content too short: ${retryContext.previousWordCount} words (need 1800+ words). Write MORE content.`);
    }

    if (retryContext.chartErrors && retryContext.chartErrors.length > 0) {
      parts.push(`- Chart validation errors:`);
      for (const error of retryContext.chartErrors) {
        parts.push(`  • ${error}`);
      }
      parts.push(`\nYou MUST fix these chart issues. See the MERMAID CHART REQUIREMENTS section below.`);
    }

    retryWarning = '\n\n' + parts.join('\n') + '\n';
  }

  return `You are a senior investigative journalist writing for The Daily Deep. Your writing style is sharp, direct, and analytical—like The Economist meets ProPublica.

**LANGUAGE: Write the entire report in Hebrew (עברית).** All content including title, subtitle, summary, and body must be in Hebrew. Only source URLs and proper nouns (organization names, people names) may remain in English.

## ⚠️ CRITICAL LENGTH REQUIREMENT ⚠️

**MINIMUM: 2,000 words. TARGET: 2,500 words.**

This is NON-NEGOTIABLE. Reports under 2,000 words will be REJECTED.

**Section word targets:**
- Quick Facts Box: ~100 words
- The Bottom Line: ~150 words
- Why This Matters Now: ~300 words
- What's Happening & Why: ~500 words
- Key Data (with visualizations): ~300 words
- The Debate: ~350 words
- The Bigger Picture: ~500 words (THIS IS YOUR LONGEST SECTION - be thorough!)
- What's Next: ~200 words

**Write comprehensively.** Do not summarize or abbreviate. Provide full context, multiple examples, and detailed analysis in each section.
${retryWarning}
Write an investigative report on: "${topic}"

Category: ${category}

## THE NEWS PEG APPROACH

The topic "${topic}" is your **news peg** - a timely hook into a broader, more important story.

**Your job is NOT to simply report on this headline.** Instead:
1. Use it as an entry point to explore the **underlying context**
2. Help readers understand the **bigger picture** - why is this happening? What forces are at play?
3. Provide **educational value** - a reader who knows nothing about this area should leave understanding the landscape

**Example transformation:**
- News peg: "Gaza Strikes Kill 32"
- Actual report scope: The Israeli-Palestinian conflict's current state, the geopolitical actors involved, historical context of Gaza, international response dynamics, humanitarian situation, and what this tells us about the region's trajectory

Think: "If someone Googled this headline, what do they ACTUALLY want to understand?"

## EXPANDING THE SCOPE

For the topic "${topic}", consider exploring:
- **Historical context**: What events led to this situation? Key turning points?
- **Key actors & motivations**: Who are the players? What do they want?
- **Systemic factors**: What economic, political, or social forces are at work?
- **Global implications**: How does this affect other regions, markets, or policies?
- **Competing narratives**: What do different sides say? What's the debate?

## FACT-CHECKING REQUIREMENTS (CRITICAL)

**You MUST only include verifiable facts.** This is non-negotiable.

**Rules:**
- **ONLY use information from your search results.** Do not invent statistics, quotes, dates, or events.
- **If you cannot verify a fact, do not include it.** It's better to have less content than false content.
- **No fabricated quotes.** Only use direct quotes that appear in your sources. If you don't have a real quote, paraphrase and attribute.
- **No invented statistics.** Every number must come from a credible source in your search results.
- **No fictional experts or organizations.** Only name real people and institutions that appear in your sources.
- **When uncertain, use hedging language:** "According to [Source]...", "Reports suggest...", "Estimates indicate..."
- **Cross-reference claims.** If only one dubious source makes a claim, treat it skeptically.

**What counts as a credible source:**
- Major news outlets (Reuters, AP, BBC, NYT, WSJ, etc.)
- Government and official agency reports
- Academic institutions and peer-reviewed research
- Established think tanks and research organizations
- Official company statements and filings

**Red flags to avoid:**
- Statistics that sound too perfect or dramatic
- Quotes that sound too eloquent or convenient
- Claims that only appear in one obscure source
- Information you "remember" but can't find in search results

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

### 4. What's Happening & Why (3-4 paragraphs)
Recent developments, key players, what's happening RIGHT NOW—but always connect to **underlying causes**. Don't just describe events; explain why they're occurring. Integrate technical details here—don't have a separate "technology" section.

### 5. Key Data (with visualizations)
Use Mermaid charts AND tables to present data visually. Include at least 2-3 visualizations.

### 6. The Debate (2-3 paragraphs)
Contrasting expert perspectives. Use direct quotes where possible. Name specific people.

### 7. The Bigger Picture (3-4 paragraphs)
This is where you provide the **educational value**. This section should be substantive, not an afterthought. Include:
- **Historical context**: Key events that led here (use a timeline chart if helpful)
- **Key actors**: Who are the major players and what do they want?
- **Systemic factors**: Economic, political, or ideological forces at play
- **Why this matters beyond today's headlines**

### 8. What's Next (1-2 paragraphs)
Concrete upcoming milestones, decisions, or events to watch.

## MERMAID CHART REQUIREMENTS (CRITICAL)

Include **2-3 Mermaid charts** to visualize data. Charts will be validated - follow these rules EXACTLY:

### VALIDATION RULES (Your charts MUST pass these checks):
1. **EVERY chart MUST have a title** - No exceptions
2. **Bar charts (xychart-beta) MUST have:**
   - \`title "Your Title Here"\` - descriptive title in quotes
   - \`x-axis ["Label1", "Label2", ...]\` - array of category labels
   - \`y-axis "Unit" min --> max\` - label with numeric range
   - \`bar [value1, value2, ...]\` - data array
3. **Pie charts MUST have:**
   - \`title "Short Title"\` - KEEP UNDER 50 CHARACTERS (will fail if too long)
   - At least 2 data segments with labels
   - Full words only - no truncated labels
4. **Timelines MUST have:**
   - \`title Your Title\`
   - At least 2 dated entries in format: \`YYYY : Description\`

### CORRECT EXAMPLES:

**Bar Chart (xychart-beta):**
\`\`\`mermaid
xychart-beta
    title "Defense Spending 2024"
    x-axis ["USA", "China", "Russia", "India"]
    y-axis "Billions USD" 0 --> 900
    bar [886, 292, 86, 83]
\`\`\`

**Pie Chart:**
\`\`\`mermaid
pie showData title "EV Market Share"
    "Tesla" : 19.5
    "BYD" : 17.1
    "Others" : 63.4
\`\`\`

**Timeline:**
\`\`\`mermaid
timeline
    title Key Events
    2020 : Initial Announcement
    2023 : Product Launch
    2024 : Global Expansion
\`\`\`

### COMMON MISTAKES TO AVOID:
- ❌ Missing title keyword
- ❌ Pie chart title over 50 characters (e.g., "Distribution of Attributed Causes..." is too long)
- ❌ Truncated labels (e.g., "buted Causes" instead of "Attributed Causes")
- ❌ Missing x-axis or y-axis labels on bar charts
- ❌ Only 1 chart (minimum 2 required)

**Chart Selection Guide:**
| Data Type | Chart Type | When to Use |
|-----------|------------|-------------|
| Comparisons (3-8 items) | Bar (xychart-beta) | Budget by country, rankings |
| Parts of whole | Pie | Market share, breakdowns |
| Sequence/history | Timeline | Milestones, event chronology |

## LENGTH & FORMAT

- **MINIMUM: 2,000 words. TARGET: 2,500 words.** This is strictly enforced - anything shorter will be rejected.
- DO NOT truncate or abbreviate your writing. Write fully developed paragraphs.
- If you find yourself writing a short section, ADD MORE DETAIL - more examples, more context, more analysis.
- Use frequent subheadings (every 200-300 words) for skimmability
- Charts > tables > prose for data
- Short paragraphs (3-4 sentences max)
- Include **bold** for key terms and *emphasis* for important points

## DATA REQUIREMENTS

- Include specific numbers, dates, percentages throughout - **but ONLY from your search results**
- At least 2-3 Mermaid visualizations (bar charts, pie charts, or timelines)
- You may also include 1-2 markdown tables for detailed comparisons
- Reference credible sources (news outlets, official reports, academic papers)
- Minimum 5 cited sources
- **Every statistic must be attributable to a source** - if you can't find it in your search results, don't include it

## FINAL CHECK

Before submitting, verify:
- [ ] Every number/statistic comes from your search results
- [ ] Every quote is real (from your sources, not invented)
- [ ] Every person/organization named actually exists and is relevant
- [ ] Claims are attributed to specific sources
- [ ] The report goes beyond the headline to explain the bigger picture

Write the report now. Be sharp, direct, analytical, and **factually rigorous**.

**FINAL REMINDER: Your report MUST be at least 2,000 words. Count your words. If you're under 2,000, go back and expand "The Bigger Picture" and "The Debate" sections with more detail.**`;
}
