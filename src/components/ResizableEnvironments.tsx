import './SplitPanels.css';
import './ResizableEnvironments.css';
import type { ReactNode } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { FiMoreVertical } from 'react-icons/fi';
import { z } from 'zod';
import { useLayoutPreference } from '../hooks/useLayoutPreference';

const sizesSchema = z.object({
  environments: z.number().positive().max(100),
  variables: z.number().positive().max(100),
});
const defaults = { environments: 27, variables: 73 };

export function ResizableEnvironments({
  environments,
  variables,
}: {
  environments: ReactNode;
  variables: ReactNode;
}) {
  const [sizes, saveSizes] = useLayoutPreference(
    'loadmaster.environment-widths.v1',
    sizesSchema,
    defaults,
  );
  return (
    <div className="environment-columns-scroll">
      <Group
        className="resizable-environments"
        orientation="horizontal"
        defaultLayout={sizes}
        onLayoutChanged={(layout, meta) => {
          if (meta.isUserInteraction) saveSizes(sizesSchema.parse(layout));
        }}
      >
        <Panel className="split-panel-content" id="environments" minSize="20%" maxSize="45%">
          {environments}
        </Panel>
        <Separator className="column-divider" aria-label="Resize Environments and Variables">
          <FiMoreVertical />
        </Separator>
        <Panel className="split-panel-content" id="variables" minSize="55%">
          {variables}
        </Panel>
      </Group>
    </div>
  );
}
