'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function MarkdownRenderer({ content, className = '' }) {
  if (!content) return null;

  return (
    <div className={`text-sm text-text-secondary leading-relaxed space-y-3 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => <h1 className="text-xl font-bold text-text-primary pt-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold text-text-primary pt-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-text-primary pt-1">{children}</h3>,
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
          strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
          code: ({ inline, children }) =>
            inline ? (
              <code className="px-1.5 py-0.5 mx-0.5 rounded bg-bg-section border border-border font-mono text-xs text-text-primary">
                {children}
              </code>
            ) : (
              <pre className="p-3 rounded-md bg-bg-input border border-border font-mono text-xs text-text-primary overflow-x-auto">
                <code>{children}</code>
              </pre>
            ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-border">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-bg-section px-3 py-1.5 text-left font-semibold text-text-primary">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border border-border px-3 py-1.5">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
