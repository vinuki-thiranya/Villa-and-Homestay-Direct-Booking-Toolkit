import { Fragment } from 'react';

/**
 * Fill a translated sentence with elements: rich(t('layout.poweredBy'), { brand: <a>…</a> }).
 * Each language keeps its own word order around the link or bold text.
 */
export function rich(template: string, nodes: Record<string, React.ReactNode>): React.ReactNode[] {
  return template.split(/(\{\w+\})/g).map((part, i) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={i}>{key && key in nodes ? nodes[key] : part}</Fragment>;
  });
}
