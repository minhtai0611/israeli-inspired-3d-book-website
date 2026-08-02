import { GLOSSARY_MAP, GLOSSARY_PATTERN } from "@/lib/glossary";
import { GlossaryTooltip } from "./GlossaryTooltip";

/** Wraps every recognized glossary term in `text` with a GlossaryTooltip. Plain server
 * markup otherwise — only the matched terms mount the (client) tooltip component. */
export function GlossaryText({ text }: { text: string }) {
  const parts = text.split(GLOSSARY_PATTERN);
  return (
    <>
      {parts.map((part, i) => {
        const entry = GLOSSARY_MAP.get(part.toLowerCase());
        return entry ? (
          <GlossaryTooltip key={i} term={entry.term} definition={entry.def}>
            {part}
          </GlossaryTooltip>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}
