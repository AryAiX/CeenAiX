import { Fragment, useMemo } from 'react';
import { Platform, View } from 'react-native';
import { Text } from '@/components/ui';
import { spacing } from '@/theme/tokens';

// Minimal Markdown for assistant replies: headings, paragraphs, bullet and
// numbered lists, **bold**, *italic* and `code`. Anything else renders as text.

type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] };

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length > 0) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };
  for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
    const heading = HEADING.exec(line);
    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    if (!line.trim()) {
      flush();
    } else if (heading) {
      flush();
      blocks.push({ kind: 'heading', text: heading[1] ?? '' });
    } else if (bullet || numbered) {
      flush();
      const ordered = Boolean(numbered);
      const item = (numbered ?? bullet)?.[1] ?? '';
      const last = blocks[blocks.length - 1];
      if (last?.kind === 'list' && last.ordered === ordered) last.items.push(item);
      else blocks.push({ kind: 'list', ordered, items: [item] });
    } else {
      paragraph.push(line.trim());
    }
  }
  flush();
  return blocks;
}

function Inline({ text }: { text: string }): React.ReactElement {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={index} variant="bodyStrong">
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <Text key={index} variant="body" style={{ fontFamily: MONO }}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
          return (
            <Text key={index} variant="body" style={{ fontStyle: 'italic' }}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}

export function MarkdownText({ children }: { children: string }): React.ReactElement {
  const blocks = useMemo(() => parseBlocks(children), [children]);
  return (
    <View style={{ gap: spacing.sm }}>
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          return (
            <Text key={index} variant="heading">
              <Inline text={block.text} />
            </Text>
          );
        }
        if (block.kind === 'paragraph') {
          return (
            <Text key={index} variant="body" selectable>
              <Inline text={block.text} />
            </Text>
          );
        }
        return (
          <View key={index} style={{ gap: 4 }}>
            {block.items.map((item, itemIndex) => (
              <View key={itemIndex} style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Text variant="body" color="muted" style={{ minWidth: 16 }}>
                  {block.ordered ? `${itemIndex + 1}.` : '•'}
                </Text>
                <Text variant="body" selectable style={{ flex: 1 }}>
                  <Inline text={item} />
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
