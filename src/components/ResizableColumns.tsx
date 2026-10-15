import type { ReactNode } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { FiMoreVertical } from 'react-icons/fi';
import { z } from 'zod';
import { useLayoutPreference } from '../hooks/useLayoutPreference';

const sizesSchema = z.object({
  collections: z.number().positive().max(100),
  apis: z.number().positive().max(100),
  configuration: z.number().positive().max(100),
});
const defaults = { collections: 20, apis: 49, configuration: 31 };
export function ResizableColumns({
  collections,
  apis,
  configuration,
}: {
  collections: ReactNode;
  apis: ReactNode;
  configuration: ReactNode;
}) {
  const [sizes, saveSizes] = useLayoutPreference(
    'loadmaster.collection-widths.v1',
    sizesSchema,
    defaults,
  );
  return (
    <div className="collections-columns-scroll">
      <Group
        className="collections-layout resizable-collections"
        orientation="horizontal"
        defaultLayout={sizes}
        onLayoutChanged={(layout, meta) => {
          if (meta.isUserInteraction) saveSizes(sizesSchema.parse(layout));
        }}
      >
        <Panel className="split-panel-content" id="collections" minSize="15%" defaultSize="20%">
          {collections}
        </Panel>
        <Separator className="column-divider" aria-label="Resize Collections and APIs">
          <FiMoreVertical />
        </Separator>
        <Panel className="split-panel-content" id="apis" minSize="28%" defaultSize="49%">
          {apis}
        </Panel>
        <Separator className="column-divider" aria-label="Resize APIs and Configuration">
          <FiMoreVertical />
        </Separator>
        <Panel className="split-panel-content" id="configuration" minSize="23%" defaultSize="31%">
          {configuration}
        </Panel>
      </Group>
    </div>
  );
}
