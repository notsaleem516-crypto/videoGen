import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Type, Palette } from 'lucide-react';
import type { EditorProps } from '../../../shared/plugin-types';
import { CollapsibleSection, ColorPicker } from '@/components/editor/PropertiesPanel';

export const CTAEditor: React.FC<EditorProps> = ({ data, onChange }) => {
  const update = (field: string, value: unknown) => onChange({ [field]: value });
  
  return (
    <div className="space-y-1">
      <CollapsibleSection title="Content" icon={Type} defaultOpen={true}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-400">Button Text</Label>
            <Input
              value={data.text as string ?? ''}
              onChange={(e) => update('text', e.target.value)}
              className="bg-gray-800/50 border-gray-700/50 text-white h-10"
            />
          </div>
        </div>
      </CollapsibleSection>
      
      <CollapsibleSection title="Style" icon={Palette} defaultOpen={false}>
        <div className="space-y-3">
          <ColorPicker value={data.color as string ?? '#3B82F6'} onChange={(v) => update('color', v)} label="Button Color" />
          <div className="flex items-center justify-between">
            <Label className="text-xs text-gray-400">Pulse Animation</Label>
            <Switch checked={data.pulse as boolean ?? true} onCheckedChange={(v) => update('pulse', v)} />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default CTAEditor;
