/**
 * shell/Workbench.tsx — the 3-panel resizable workbench.
 *
 * The studio (and every generative surface) renders inside this frame:
 *   left   — the surface sidebar (sessions, faces)
 *   center — the conversation (user messages, the pipeline trace, the composer)
 *   right  — the artifact panel (the live preview + actions)
 *
 * Built on react-resizable-panels v4 (the RENAMED API):
 *   PanelGroup → Group, PanelResizeHandle → Separator, direction → orientation,
 *   autoSaveId → useDefaultLayout. Numbers are pixels; the side panels are
 *   collapsible (drag past min, or double-click the separator to reset).
 */
import type { ReactNode } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import './Workbench.css';

export interface WorkbenchProps {
  /** Left sidebar slot (16rem default, collapsible). */
  left?: ReactNode;
  /** Center conversation slot (takes the remaining space). */
  center?: ReactNode;
  /** Right artifact slot (22rem default, collapsible). */
  right?: ReactNode;
}

/** The 3-panel resizable workbench frame. Geometry lives in Workbench.css;
 *  this component owns only the panel arrangement. */
export function Workbench({ left, center, right }: WorkbenchProps) {
  return (
    <Group orientation="horizontal" className="workbench">
      {left && (
        <>
          <Panel
            className="workbench__pane"
            defaultSize={256}
            minSize={192}
            maxSize={384}
            collapsible
            collapsedSize={0}
          >
            {left}
          </Panel>
          <Separator className="workbench__separator" />
        </>
      )}

      <Panel className="workbench__pane workbench__pane--center" minSize={320}>
        {center}
      </Panel>

      {right && (
        <>
          <Separator className="workbench__separator" />
          <Panel
            className="workbench__pane"
            defaultSize={352}
            minSize={256}
            maxSize={640}
            collapsible
            collapsedSize={0}
          >
            {right}
          </Panel>
        </>
      )}
    </Group>
  );
}