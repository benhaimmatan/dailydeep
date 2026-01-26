/**
 * Build the report generation prompt
 *
 * Creates a detailed prompt for Gemini to generate investigative reports
 * matching The Daily Deep's editorial standards.
 */
export function buildReportPrompt(topic: string, category: string): string {
  return `You are an investigative journalist writing for The Daily Deep, a premium publication known for rigorous, data-driven analysis.

Write a comprehensive investigative report on: "${topic}"

Category: ${category}

REQUIREMENTS:
1. LENGTH: 3,500+ words of substantive content
2. STRUCTURE: Use markdown with clear section headers (##, ###)
3. DATA: Include specific numbers, percentages, dates, and statistics
4. TABLES: Include at least 2 markdown tables with relevant data
5. ANALYSIS: Provide deep analysis, not surface-level overview
6. BALANCE: Present multiple perspectives on controversial topics
7. SOURCES: Reference credible sources (news outlets, academic papers, official reports)
8. TONE: Professional, authoritative, accessible to general audience

SECTIONS TO INCLUDE:
- Executive Overview (2-3 paragraphs)
- Background & Context (historical perspective)
- Current Situation (recent developments, key players)
- Data Analysis (with tables and specific figures)
- Expert Perspectives (different viewpoints)
- Implications & Outlook (what this means going forward)
- Conclusion

Write the report now. Be thorough and specific.`;
}
