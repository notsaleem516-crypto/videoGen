'use client';

import { useEditorStore } from '@/store/editor-store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings2 } from 'lucide-react';

export function VideoMetaEditor() {
  const { videoInput, updateVideoMeta } = useEditorStore();
  const { videoMeta } = videoInput;

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-purple-400" />
          Video Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-gray-400">Aspect Ratio</Label>
            <Select
              value={videoMeta.aspectRatio}
              onValueChange={(v) => updateVideoMeta({ aspectRatio: v as '9:16' | '16:9' | '1:1' | '4:5' })}
            >
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white text-sm h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9:16">9:16 (Vertical)</SelectItem>
                <SelectItem value="16:9">16:9 (Horizontal)</SelectItem>
                <SelectItem value="1:1">1:1 (Square)</SelectItem>
                <SelectItem value="4:5">4:5 (Portrait)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-gray-400">FPS</Label>
            <Select
              value={videoMeta.fps.toString()}
              onValueChange={(v) => updateVideoMeta({ fps: parseInt(v) })}
            >
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white text-sm h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 FPS</SelectItem>
                <SelectItem value="30">30 FPS</SelectItem>
                <SelectItem value="60">60 FPS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div>
          <Label className="text-xs text-gray-400">Theme</Label>
          <Select
            value={videoMeta.theme}
            onValueChange={(v) => updateVideoMeta({ theme: v as 'dark_modern' | 'light_minimal' | 'bold_vibrant' | 'corporate' })}
          >
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white text-sm h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark_modern">Dark Modern</SelectItem>
              <SelectItem value="light_minimal">Light Minimal</SelectItem>
              <SelectItem value="bold_vibrant">Bold Vibrant</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
