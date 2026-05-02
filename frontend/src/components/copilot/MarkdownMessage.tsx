import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/cn";

const components: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  h1: ({ children }) => (
    <h1 className="text-base font-bold mb-2 mt-3 first:mt-0 text-brand-text">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-bold mb-1.5 mt-2.5 first:mt-0 text-brand-text">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0 text-brand-text">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-medium mb-1 mt-2 first:mt-0 text-brand-text">{children}</h4>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-4 mb-2 space-y-0.5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-4 mb-2 space-y-0.5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed pl-0.5">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-brand-accent/50 pl-3 my-2 text-brand-muted italic">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => (
    <pre className="bg-[#f6f8fa] border border-brand-border/20 rounded-lg p-3 my-2 overflow-x-auto text-xs leading-relaxed font-mono">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (!isBlock) {
      return (
        <code className="bg-[#f6f8fa] border border-brand-border/20 px-1.5 py-0.5 rounded text-[0.82em] font-mono text-[#d6336c]">
          {children}
        </code>
      );
    }
    return <code className={cn("font-mono text-xs", className)}>{children}</code>;
  },
  table: ({ children }) => (
    <div className="overflow-x-auto my-2 rounded-lg border border-brand-border/30">
      <table className="min-w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-brand-bg border-b border-brand-border/30">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-brand-text">{children}</th>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-brand-border/10 last:border-0 even:bg-brand-bg/40">{children}</tr>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-brand-text">{children}</td>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-accent hover:underline underline-offset-2"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-brand-text">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => <hr className="border-brand-border/20 my-3" />,
};

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  return (
    <div className={cn("text-sm text-brand-text leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
