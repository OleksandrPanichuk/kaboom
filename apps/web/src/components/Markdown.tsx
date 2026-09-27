import ReactMarkdown from "react-markdown";

interface MarkdownProps {
  children: string;
}

export function Markdown({ children }: MarkdownProps) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-6 text-foreground [&_a]:text-indigo-700 [&_a]:underline [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:text-[0.85em] [&_em]:italic [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p>strong:only-child]:mt-2 [&_p>strong:only-child]:block [&_strong]:font-semibold [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:pl-5">
      <ReactMarkdown skipHtml>{children}</ReactMarkdown>
    </div>
  );
}
