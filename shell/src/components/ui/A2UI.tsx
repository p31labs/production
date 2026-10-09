import { ReactNode, useMemo } from 'react';
import { A2UIElement } from './catalog';
import A2Button from './A2Button';
import A2Card from './A2Card';
import A2Badge from './A2Badge';
import A2Meter from './A2Meter';
import A2ProgressBar from './A2ProgressBar';
import A2Tabs from './A2Tabs';
import A2List from './A2List';
import A2Table from './A2Table';
import A2Modal from './A2Modal';
import A2Form from './A2Form';
import A2Grid from './A2Grid';
import A2Toast from './A2Toast';
import A2DataCard from '@p31ca/design-core/a2ui/DataCard';

export type A2UIAction = (action: string, payload?: unknown, el?: HTMLElement) => void;

export interface A2UIProps {
  ui: A2UIElement[];
  onAction?: A2UIAction;
  onToast?: (message: string, variant?: string) => void;
}

export default function A2UI({ ui, onAction, onToast }: A2UIProps) {
  const byId = useMemo(() => new Map(ui.map((e) => [e.id, e])), [ui]);

  const resolve = (def: A2UIElement): ReactNode => {
    const props: any = def.props ?? {};
    const children = (def.children ?? [])
      .map((id) => {
        const child = byId.get(id);
        return child ? resolve(child) : null;
      })
      .filter((n): n is ReactNode => n !== null);

    switch (def.component) {
      case 'Button':
        return <A2Button key={def.id} {...props} onAction={onAction} />;
      case 'Card':
        return <A2Card key={def.id} {...props} children={children} onAction={onAction} />;
      case 'Form':
        return <A2Form key={def.id} {...props} onAction={onAction} />;
      case 'List':
        return <A2List key={def.id} {...props} onAction={onAction} />;
      case 'Badge':
        return <A2Badge key={def.id} {...props} />;
      case 'ProgressBar':
        return <A2ProgressBar key={def.id} {...props} />;
      case 'Modal':
        return <A2Modal key={def.id} {...props} children={children} onAction={onAction} />;
      case 'Table':
        return <A2Table key={def.id} {...props} />;
      case 'Tabs':
        return <A2Tabs key={def.id} {...props} />;
      case 'Toast':
        return <A2Toast key={def.id} {...props} onToast={onToast} />;
      case 'Meter':
        return <A2Meter key={def.id} {...props} />;
      case 'Grid':
        return <A2Grid key={def.id} {...props} />;
      case 'DataCard':
        return <A2DataCard key={def.id} {...props} onAction={onAction} />;
      default:
        throw new Error(`Unknown A2UI component: ${String((def as A2UIElement).component)}`);
    }
  };

  return <>{ui.map(resolve)}</>;
}
