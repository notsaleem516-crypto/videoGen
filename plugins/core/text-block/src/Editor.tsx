import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Type, Palette } from 'lucide-react';
import type { EditorProps } from '../../../shared/plugin-types';
import { CollapsibleSection, ColorPicker } from '@/components/editor/PropertiesPanel';

export const TextEditor: React.FC<EditorProps> = ({ data, onChange }) => {
  const updateField = (field: string, value: unknown) => {
    onChange({ [field]: value });
  };
  
  return (
    <div className="space-y-1">
      <CollapsibleSection title="Content" icon={Type} defaultOpen={true}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-400">Content</Label>
            <Textarea
              value={data.content as string ?? ''}
              onChange={(e) => updateField('content', e.target.value)}
              className="bg-gray-800/50 border-gray-700/50 text-white min-h-[100px]"
              rows={4}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-400">Style</Label>
            <Select
              value={data.style as string ?? 'heading'}
              onValueChange={(v) => updateField('style', v)}
            >
              <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="heading">Heading</SelectItem>
                <SelectItem value="body">Body</SelectItem>
                <SelectItem value="caption">Caption</SelectItem>
                <SelectItem value="quote">Quote</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleSection>
      
      <CollapsibleSection title="Style" icon={Palette} defaultOpen={false}>
        <div className="space-y-3">
          <ColorPicker
            value={data.color as string ?? '#FFFFFF'}
            onChange={(v) => updateField('color', v)}
            label="Text Color"
          />
          <div>
            <Label className="text-xs text-gray-400">Alignment</Label>
            <Select
              value={data.align as string ?? 'center'}
              onValueChange={(v) => updateField('align', v)}
            >
              <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-400">Font Size</Label>
            <Select
              value={data.fontSize as string ?? 'xlarge'}
              onValueChange={(v) => updateField('fontSize', v)}
            >
              <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="xlarge">Extra Large</SelectItem>
                <SelectItem value="xxlarge">2X Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default TextEditor;
