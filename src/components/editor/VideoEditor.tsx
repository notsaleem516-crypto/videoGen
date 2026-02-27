'use client';

import {
  BlockLibrarySidebar,
  VideoPreview,
  TimelineEditor,
  PropertiesPanel,
  EditorToolbar,
  VideoMetaEditor,
} from '@/components/editor';
import { ScrollArea } from '@/components/ui/scroll-area';

export function VideoEditor() {
  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      {/* Top Toolbar */}
      <EditorToolbar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Block Library */}
        <BlockLibrarySidebar />
        
        {/* Left Panel - Video Settings */}
        <div className="w-64 bg-gray-900/50 border-r border-gray-800 p-3">
          <ScrollArea className="h-full">
            <VideoMetaEditor />
          </ScrollArea>
        </div>
        
        {/* Center - Video Preview */}
        <VideoPreview />
        
        {/* Right Sidebar - Properties Panel */}
        <PropertiesPanel />
      </div>
      
      {/* Bottom - Timeline */}
      <TimelineEditor />
    </div>
  );
}
