/**
 * Mermaid Chart Validator
 *
 * Validates Mermaid charts in generated report content to ensure
 * they are complete, properly formatted, and will render correctly.
 */

export interface MermaidValidationResult {
  isValid: boolean;
  chartCount: number;
  errors: string[];
  warnings: string[];
}

interface ChartInfo {
  index: number;
  type: string;
  content: string;
}

/**
 * Extract all Mermaid code blocks from content
 */
function extractMermaidBlocks(content: string): ChartInfo[] {
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  const charts: ChartInfo[] = [];
  let match;
  let index = 0;

  while ((match = mermaidRegex.exec(content)) !== null) {
    const chartContent = match[1].trim();
    const type = detectChartType(chartContent);
    charts.push({
      index: index++,
      type,
      content: chartContent,
    });
  }

  return charts;
}

/**
 * Detect the chart type from content
 */
function detectChartType(content: string): string {
  const firstLine = content.split('\n')[0].trim().toLowerCase();

  if (firstLine.startsWith('xychart-beta')) return 'xychart-beta';
  if (firstLine.startsWith('pie')) return 'pie';
  if (firstLine.startsWith('timeline')) return 'timeline';
  if (firstLine.startsWith('flowchart') || firstLine.startsWith('graph')) return 'flowchart';
  if (firstLine.startsWith('sequencediagram')) return 'sequence';
  if (firstLine.startsWith('gantt')) return 'gantt';

  return 'unknown';
}

/**
 * Validate xychart-beta (bar/line charts)
 */
function validateXYChart(chart: ChartInfo): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const content = chart.content;
  const chartLabel = `Chart ${chart.index + 1} (xychart-beta)`;

  // Check for title
  const titleMatch = content.match(/title\s+"([^"]+)"/);
  if (!titleMatch) {
    errors.push(`${chartLabel} missing title`);
  } else {
    const title = titleMatch[1];
    // Check for truncation (starts with lowercase or mid-word patterns)
    if (/^[a-z]/.test(title) || /^\w*[A-Z]/.test(title.slice(1, 4))) {
      warnings.push(`${chartLabel} title may be truncated: "${title.slice(0, 30)}..."`);
    }
  }

  // Check for x-axis with labels
  const xAxisMatch = content.match(/x-axis\s+\[([^\]]+)\]/);
  if (!xAxisMatch) {
    // Check for x-axis with string label (e.g., x-axis "Label")
    const xAxisLabelMatch = content.match(/x-axis\s+"([^"]+)"/);
    if (!xAxisLabelMatch) {
      errors.push(`${chartLabel} missing x-axis labels`);
    }
  }

  // Check for y-axis with range
  const yAxisMatch = content.match(/y-axis\s+(?:"[^"]+"\s+)?(\d+)\s*-->\s*(\d+)/);
  if (!yAxisMatch) {
    // Check for y-axis with just a label
    const yAxisLabelMatch = content.match(/y-axis\s+"([^"]+)"/);
    if (!yAxisLabelMatch) {
      errors.push(`${chartLabel} missing y-axis definition`);
    }
  }

  // Check for data (bar or line)
  const hasBar = /\bbar\s+\[/.test(content);
  const hasLine = /\bline\s+\[/.test(content);
  if (!hasBar && !hasLine) {
    errors.push(`${chartLabel} missing data (no bar or line data found)`);
  }

  return { errors, warnings };
}

/**
 * Validate pie charts
 */
function validatePieChart(chart: ChartInfo): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const content = chart.content;
  const chartLabel = `Chart ${chart.index + 1} (pie)`;

  // Check for title - pie charts use "title" keyword
  const titleMatch = content.match(/title\s+"([^"]+)"/);
  if (!titleMatch) {
    // Also check for inline title format: pie title "..."
    const inlineTitleMatch = content.match(/pie(?:\s+showData)?\s+title\s+"([^"]+)"/);
    if (!inlineTitleMatch) {
      errors.push(`${chartLabel} missing title`);
    } else {
      const title = inlineTitleMatch[1];
      if (title.length > 50) {
        warnings.push(`${chartLabel} title too long (${title.length} chars, max 50): "${title.slice(0, 30)}..."`);
      }
      // Check for truncation
      if (/^[a-z]/.test(title) || title.includes('...')) {
        warnings.push(`${chartLabel} title appears truncated: "${title.slice(0, 30)}..."`);
      }
    }
  } else {
    const title = titleMatch[1];
    if (title.length > 50) {
      warnings.push(`${chartLabel} title too long (${title.length} chars, max 50): "${title.slice(0, 30)}..."`);
    }
  }

  // Check for data segments (at least 2)
  const segmentMatches = content.match(/"[^"]+"\s*:\s*[\d.]+/g);
  if (!segmentMatches || segmentMatches.length < 2) {
    errors.push(`${chartLabel} needs at least 2 data segments (found ${segmentMatches?.length || 0})`);
  }

  // Check for truncated labels (starting with lowercase or partial words)
  if (segmentMatches) {
    for (const segment of segmentMatches) {
      const labelMatch = segment.match(/"([^"]+)"/);
      if (labelMatch) {
        const label = labelMatch[1];
        // Check if label starts with lowercase (possible mid-word truncation)
        if (/^[a-z]{2,}/.test(label) && !isCommonLowercaseWord(label)) {
          warnings.push(`${chartLabel} label may be truncated: "${label}"`);
        }
      }
    }
  }

  return { errors, warnings };
}

/**
 * Check if a word is commonly lowercase (not truncated)
 */
function isCommonLowercaseWord(word: string): boolean {
  const commonWords = ['the', 'and', 'for', 'with', 'from', 'other', 'others', 'all', 'new', 'old'];
  return commonWords.includes(word.toLowerCase());
}

/**
 * Validate timeline charts
 */
function validateTimeline(chart: ChartInfo): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const content = chart.content;
  const chartLabel = `Chart ${chart.index + 1} (timeline)`;

  // Check for title
  const titleMatch = content.match(/title\s+(.+?)(?:\n|$)/);
  if (!titleMatch) {
    errors.push(`${chartLabel} missing title`);
  }

  // Check for timeline entries (year/date : description format)
  const entryMatches = content.match(/\d{4}\s*:\s*.+/g);
  if (!entryMatches || entryMatches.length < 2) {
    errors.push(`${chartLabel} needs at least 2 timeline entries (found ${entryMatches?.length || 0})`);
  }

  return { errors, warnings };
}

/**
 * Validate flowchart
 */
function validateFlowchart(chart: ChartInfo): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const content = chart.content;
  const chartLabel = `Chart ${chart.index + 1} (flowchart)`;

  // Check for nodes (alphanumeric identifiers with brackets/parentheses)
  const nodeMatches = content.match(/\w+[\[\(][^\]\)]+[\]\)]/g);
  if (!nodeMatches || nodeMatches.length < 2) {
    errors.push(`${chartLabel} needs at least 2 nodes (found ${nodeMatches?.length || 0})`);
  }

  // Check for connections (arrows)
  const connectionMatches = content.match(/--[->]|==>/g);
  if (!connectionMatches || connectionMatches.length < 1) {
    errors.push(`${chartLabel} needs at least 1 connection between nodes`);
  }

  return { errors, warnings };
}

/**
 * Validate a single chart based on its type
 */
function validateChart(chart: ChartInfo): { errors: string[]; warnings: string[] } {
  switch (chart.type) {
    case 'xychart-beta':
      return validateXYChart(chart);
    case 'pie':
      return validatePieChart(chart);
    case 'timeline':
      return validateTimeline(chart);
    case 'flowchart':
      return validateFlowchart(chart);
    default:
      return { errors: [], warnings: [`Chart ${chart.index + 1} has unknown type: ${chart.type}`] };
  }
}

/**
 * Validate all Mermaid charts in content
 *
 * @param content - The report content containing Mermaid code blocks
 * @returns Validation result with errors and warnings
 */
export function validateMermaidCharts(content: string): MermaidValidationResult {
  const charts = extractMermaidBlocks(content);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check minimum chart count
  if (charts.length < 2) {
    errors.push(`Only ${charts.length} chart(s) found, minimum 2 required`);
  }

  // Validate each chart
  for (const chart of charts) {
    const result = validateChart(chart);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return {
    isValid: errors.length === 0,
    chartCount: charts.length,
    errors,
    warnings,
  };
}

/**
 * Format validation result as a string for logging/retry prompts
 */
export function formatValidationErrors(result: MermaidValidationResult): string {
  const parts: string[] = [];

  if (result.errors.length > 0) {
    parts.push(`ERRORS: ${result.errors.join('; ')}`);
  }

  if (result.warnings.length > 0) {
    parts.push(`WARNINGS: ${result.warnings.join('; ')}`);
  }

  return parts.join(' | ');
}
