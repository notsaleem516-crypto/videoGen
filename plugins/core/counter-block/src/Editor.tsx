// ============================================================================
// COUNTER EDITOR COMPONENT - Properties panel editor for counter block
// ============================================================================

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Type, Zap, Palette } from 'lucide-react';
import type { EditorProps } from '../../../shared/plugin-types';
import { CollapsibleSection, ColorPicker, SliderInput } from '@/components/editor/PropertiesPanel';

/**
 * Counter Editor Component
 */
export const CounterEditor: React.FC<EditorProps> = ({ data, index, onChange }) => {
  const updateField = (field: string, value: unknown) => {
    onChange({ [field]: value });
  };
  
  return (
    <div className="space-y-1">
      {/* Content Section */}
      <CollapsibleSection title="Content" icon={Type} defaultOpen={true}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-400">Target Value</Label>
            <Input
              type="number"
              value={data.value as number ?? 10000}
              onChange={(e) => updateField('value', parseFloat(e.target.value) || 0)}
              className="bg-gray-800/50 border-gray-700/50 text-white h-10"
            />
          </div>
          
          <div>
            <Label className="text-xs text-gray-400">Starting Value</Label>
            <Input
              type="number"
              value={data.from as number ?? 0}
              onChange={(e) => updateField('from', parseFloat(e.target.value) || 0)}
              className="bg-gray-800/50 border-gray-700/50 text-white h-10"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-gray-400">Prefix</Label>
              <Input
                value={data.prefix as string ?? ''}
                onChange={(e) => updateField('prefix', e.target.value)}
                className="bg-gray-800/50 border-gray-700/50 text-white h-10"
                placeholder="$"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Suffix</Label>
              <Input
                value={data.suffix as string ?? ''}
                onChange={(e) => updateField('suffix', e.target.value)}
                className="bg-gray-800/50 border-gray-700/50 text-white h-10"
                placeholder="+"
              />
            </div>
          </div>
          
          <div>
            <Label className="text-xs text-gray-400">Label</Label>
            <Input
              value={data.label as string ?? ''}
              onChange={(e) => updateField('label', e.target.value)}
              className="bg-gray-800/50 border-gray-700/50 text-white h-10"
              placeholder="Downloads"
            />
          </div>
        </div>
      </CollapsibleSection>
      
      {/* Animation Section */}
      <CollapsibleSection title="Animation" icon={Zap} defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-400">Animation Style</Label>
            <Select
              value={data.animationStyle as string ?? 'easeOut'}
              onValueChange={(v) => updateField('animationStyle', v)}
            >
              <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="easeOut">Ease Out</SelectItem>
                <SelectItem value="easeInOut">Ease In Out</SelectItem>
                <SelectItem value="bounce">Bounce</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <SliderInput
            label="Duration"
            value={data.duration as number ?? 3}
            onChange={(v) => updateField('duration', v)}
            min={1}
            max={10}
            step={0.5}
            unit="s"
          />
          
          <SliderInput
            label="Decimal Places"
            value={data.decimals as number ?? 0}
            onChange={(v) => updateField('decimals', v)}
            min={0}
            max={5}
            step={1}
            unit=""
          />
        </div>
      </CollapsibleSection>
      
      {/* Style Section */}
      <CollapsibleSection title="Style" icon={Palette} defaultOpen={false}>
        <div className="space-y-3">
          <ColorPicker
            value={data.color as string ?? '#3B82F6'}
            onChange={(v) => updateField('color', v)}
            label="Text Color"
          />
          
          <div>
            <Label className="text-xs text-gray-400">Font Size</Label>
            <Select
              value={data.fontSize as string ?? 'xxlarge'}
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
          
          <div>
            <Label className="text-xs text-gray-400">Font Weight</Label>
            <Select
              value={data.fontWeight as string ?? 'black'}
              onValueChange={(v) => updateField('fontWeight', v)}
            >
              <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
                <SelectItem value="black">Black</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-xs text-gray-400">Glow Effect</Label>
            <Switch
              checked={data.glowEnabled as boolean ?? true}
              onCheckedChange={(v) => updateField('glowEnabled', v)}
            />
          </div>
          
          {data.glowEnabled && (
            <ColorPicker
              value={data.glowColor as string ?? data.color as string ?? '#3B82F6'}
              onChange={(v) => updateField('glowColor', v)}
              label="Glow Color"
            />
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default CounterEditor;
