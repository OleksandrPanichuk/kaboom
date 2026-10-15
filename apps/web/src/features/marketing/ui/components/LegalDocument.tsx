import ReactMarkdown from "react-markdown";

interface LegalDocumentProps {
  content: string;
}

export function LegalDocument({ content }: LegalDocumentProps) {
  return (
    <div className="flex flex-col gap-4 text-[15px] leading-7 text-muted-foreground [&_a]:text-interactive-foreground [&_a]:underline [&_h2]:mt-6 [&_h2]:scroll-mt-24 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-[-0.02em] [&_h2]:text-foreground [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5">
      <ReactMarkdown skipHtml>{content}</ReactMarkdown>
    </div>
  );
}
