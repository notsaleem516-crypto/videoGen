// ============================================================================
// WEATHER EDITOR COMPONENT - Properties panel editor for weather block
// ============================================================================

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { MapPin, Droplets, Wind, Palette, ChevronDown } from 'lucide-react';
import type { EditorProps } from '../../../shared/plugin-types';
import { CollapsibleSection, ColorPicker, SliderInput } from '@/components/editor/PropertiesPanel';

export const WeatherEditor: React.FC<EditorProps> = ({ data, onChange }) => {
  const update = (field: string, value: unknown) => {
    onChange({ [field]: value });
  };
  
  return (
    <div className="space-y-1">
      {/* Location & Temperature Section */}
      <CollapsibleSection title="Location & Temperature" icon={MapPin} defaultOpen={true}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-400">Location</Label>
            <Input
              value={data.location as string ?? 'San Francisco'}
              onChange={(e) => update('location', e.target.value)}
              className="bg-gray-800/50 border-gray-700/50 text-white h-10"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-400">Temperature</Label>
            <Input
              type="number"
              value={data.temperature as number ?? 72}
              onChange={(e) => update('temperature', parseFloat(e.target.value) || 0)}
              className="bg-gray-800/50 border-gray-700/50 text-white h-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-400">Unit</Label>
              <Select
                value={data.unit as string ?? 'F'}
                onValueChange={(v) => update('unit', v)}
              >
                <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="F">°F</SelectItem>
                  <SelectItem value="C">°C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label className="text-xs text-gray-400">Condition</Label>
            <Select
              value={data.condition as string ?? 'partly-cloudy'}
              onValueChange={(v) => update('condition', v)}
              >
              <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sunny">☀️ Sunny</SelectItem>
                <SelectItem value="partly-cloudy">⛅ Partly Cloudy</SelectItem>
                <SelectItem value="cloudy">☁️ Cloudy</SelectItem>
                <SelectItem value="rainy">🌧️ Rainy</SelectItem>
                <SelectItem value="stormy">⛈️ Stormy</SelectItem>
                <SelectItem value="snowy">❄️ Snowy</SelectItem>
                <SelectItem value="windy">💨 Windy</SelectItem>
                <SelectItem value="foggy">🌫️ Foggy</SelectItem>
                <SelectItem value="night-clear">🌙 Night Clear</SelectItem>
                <SelectItem value="night-cloudy">☁️ Night Cloudy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-xs text-gray-400">Description</Label>
            <Input
              value={data.description as string ?? 'Partly cloudy'}
              onChange={(e) => update('description', e.target.value)}
              className="bg-gray-800/50 border-gray-700/50 text-white h-10"
            />
          </div>
        </div>
      </CollapsibleSection>
      
      {/* Details Section */}
      <CollapsibleSection title="Details" icon={Droplets} defaultOpen={false}>
        <div className="space-y-3">
          <SliderInput
            label="Humidity"
            value={data.humidity as number ?? 65}
            onChange={(v) => update('humidity', v)}
            min={0}
            max={100}
            step={1}
            unit="%"
          />
          <SliderInput
            label="Wind Speed"
            value={data.windSpeed as number ?? 12}
            onChange={(v) => update('windSpeed', v)}
            min={0}
            max={100}
            step={1}
            unit=" mph"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-400">High</Label>
              <Input
                type="number"
                value={data.highTemp as number ?? 78}
                onChange={(e) => update('highTemp', parseFloat(e.target.value) || 0)}
                className="bg-gray-800/50 border-gray-700/50 text-white h-10"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-400">Low</Label>
              <Input
                type="number"
                value={data.lowTemp as number ?? 58}
                onChange={(e) => update('lowTemp', parseFloat(e.target.value) || 0)}
                className="bg-gray-800/50 border-gray-700/50 text-white h-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-2">
            <Switch
              checked={data.showForecast as boolean ?? true}
              onCheckedChange={(v) => update('showForecast', v)}
            />
            <Label className="text-xs text-gray-400">Show High/Low</Label>
          </div>
          
          <div className="flex gap-2 mt-2">
            <Switch
              checked={data.showDetails as boolean ?? true}
              onCheckedChange={(v) => update('showDetails', v)}
            />
            <Label className="text-xs text-gray-400">Show Humidity & Wind</Label>
          </div>
        </div>
      </CollapsibleSection>
      
      {/* Style Section */}
      <CollapsibleSection title="Style" icon={Palette} defaultOpen={false}>
        <div className="space-y-3">
          <ColorPicker
            value={data.accentColor as string ?? '#38BDF8'}
            onChange={(v) => update('accentColor', v)}
            label="Accent Color"
          />
          <div>
            <Label className="text-xs text-gray-400">Card Style</Label>
            <Select
              value={data.cardStyle as string ?? 'glass'}
              onValueChange={(v) => update('cardStyle', v)}
            >
              <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="glass">Glass Effect</SelectItem>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <Switch
              checked={data.animateIcon as boolean ?? true}
              onCheckedChange={(v) => update('animateIcon', v)}
            />
            <Label className="text-xs text-gray-400">Animate Icon</Label>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default WeatherEditor;
