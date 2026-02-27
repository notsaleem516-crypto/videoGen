import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Type, Palette } from 'lucide-react';
import type { EditorProps } from '../../../shared/plugin-types';
import { CollapsibleSection, ColorPicker } from '@/components/editor/PropertiesPanel';

export const StatEditor: React.FC<EditorProps> = ({ data, onChange }) => {
  const update = (field: string, value: unknown) => onChange({ [field]: value });
  
  return (
    <div className="space-y-1">
      <CollapsibleSection title="Content" icon={Type} defaultOpen={true}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-400">Heading</Label>
            <Input value={data.heading as string ?? ''} onChange={(e) => update('heading', e.target.value)} className="bg-gray-800/50 border-gray-700/50 text-white h-10" />
          </div>
          <div>
            <Label className="text-xs text-gray-400">Value</Label>
            <Input value={data.value as string ?? ''} onChange={(e) => update('value', e.target.value)} className="bg-gray-800/50 border-gray-700/50 text-white h-10" />
          </div>
          <div>
            <Label className="text-xs text-gray-400">Trend</Label>
            <Select value={data.trend as string ?? 'up'} onValueChange={(v) => update('trend', v)}>
              <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="up">↑ Up</SelectItem>
                <SelectItem value="down">↓ Down</SelectItem>
                <SelectItem value="neutral">— Neutral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Style" icon={Palette} defaultOpen={false}>
        <ColorPicker value={data.color as string ?? '#10B981'} onChange={(v) => update('color', v)} label="Accent Color" />
      </CollapsibleSection>
    </div>
  );
};

export default StatEditor;
