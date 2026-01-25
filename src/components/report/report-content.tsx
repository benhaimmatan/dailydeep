'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

interface ReportContentProps {
  content: string
}

/**
 * Slugify text for heading IDs (must match extract-headings utility)
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Custom styled markdown components for editorial appearance
 */
const components: Components = {
  // Headings with Playfair Display and proper spacing
  h1: ({ children }) => (
    <h1 className="font-playfair text-4xl font-bold mt-8 mb-6 text-foreground">
      {children}
    </h1>
  ),
  h2: ({ children }) => {
    const text = typeof children === 'string' ? children : String(children)
    const id = slugify(text)
    return (
      <h2
        id={id}
        className="font-playfair text-2xl font-bold mt-10 mb-4 text-foreground scroll-mt-24"
      >
        {children}
      </h2>
    )
  },
  h3: ({ children }) => {
    const text = typeof children === 'string' ? children : String(children)
    const id = slugify(text)
    return (
      <h3
        id={id}
        className="font-playfair text-xl font-semibold mt-8 mb-3 text-foreground scroll-mt-24"
      >
        {children}
      </h3>
    )
  },
  h4: ({ children }) => (
    <h4 className="font-playfair text-lg font-semibold mt-6 mb-2 text-foreground">
      {children}
    </h4>
  ),

  // Paragraphs with serif feel and relaxed line-height
  p: ({ children }) => (
    <p className="font-serif text-lg leading-relaxed mb-6 text-foreground/90">
      {children}
    </p>
  ),

  // Tables with minimal, editorial styling
  table: ({ children }) => (
    <div className="overflow-x-auto my-8">
      <table className="w-full">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-border/30">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="text-left py-3 px-4 font-semibold text-foreground border-b border-border/50">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="py-3 px-4 text-foreground/90">{children}</td>
  ),

  // Blockquotes with gold left border accent
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary pl-4 my-6 italic text-foreground/70">
      {children}
    </blockquote>
  ),

  // Links with gold color, external links open in new tab
  a: ({ href, children }) => {
    const isExternal = href?.startsWith('http')
    return (
      <a
        href={href}
        className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
        {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
      >
        {children}
      </a>
    )
  },

  // Unordered lists
  ul: ({ children }) => (
    <ul className="list-disc list-outside ml-6 mb-6 space-y-2">{children}</ul>
  ),

  // Ordered lists
  ol: ({ children }) => (
    <ol className="list-decimal list-outside ml-6 mb-6 space-y-2">
      {children}
    </ol>
  ),

  // List items
  li: ({ children }) => (
    <li className="text-lg leading-relaxed text-foreground/90">{children}</li>
  ),

  // Code blocks
  pre: ({ children }) => (
    <pre className="bg-muted rounded-md p-4 my-6 overflow-x-auto">
      {children}
    </pre>
  ),

  // Inline code
  code: ({ children, className }) => {
    // Check if this is inside a pre (code block) or inline
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return <code className="text-sm font-mono">{children}</code>
    }
    return (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    )
  },

  // Strong/bold text
  strong: ({ children }) => (
    <strong className="font-bold text-foreground">{children}</strong>
  ),

  // Emphasis/italic text
  em: ({ children }) => <em className="italic">{children}</em>,

  // Horizontal rule
  hr: () => <hr className="border-border/50 my-8" />,
}

/**
 * Renders markdown content with premium editorial styling
 */
export function ReportContent({ content }: ReportContentProps) {
  return (
    <div className="prose-custom">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
