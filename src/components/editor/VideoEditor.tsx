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
import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ChevronDown, ChevronUp, PanelLeft, PanelRight, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

export function VideoEditor() {
  useKeyboardShortcuts();

  const [showLibrary, setShowLibrary] = useState(true);
  const [showSettings, setShowSettings] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);

  return (
    <div className="h-screen flex flex-col bg-[#070b14] overflow-hidden text-white">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.14),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.16),transparent_35%)]" />
      <EditorToolbar />

      <div className="h-11 border-b border-cyan-400/20 bg-[#0b1220]/85 backdrop-blur-xl px-4 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-xs text-cyan-100/80 hover:text-cyan-100 hover:bg-cyan-500/10" onClick={() => setShowLibrary((v) => !v)}>
            <PanelLeft className="w-4 h-4 mr-1.5" />
            Library
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-cyan-100/80 hover:text-cyan-100 hover:bg-cyan-500/10" onClick={() => setShowSettings((v) => !v)}>
            <SlidersHorizontal className="w-4 h-4 mr-1.5" />
            Settings
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-cyan-100/80 hover:text-cyan-100 hover:bg-cyan-500/10" onClick={() => setShowProperties((v) => !v)}>
            <PanelRight className="w-4 h-4 mr-1.5" />
            Properties
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs text-cyan-100/80 hover:text-cyan-100 hover:bg-cyan-500/10" onClick={() => setShowTimeline((v) => !v)}>
          {showTimeline ? <ChevronDown className="w-4 h-4 mr-1.5" /> : <ChevronUp className="w-4 h-4 mr-1.5" />}
          Timeline
        </Button>
      </div>

      <div className="flex-1 min-h-0 z-10">
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={72} minSize={45}>
            <ResizablePanelGroup direction="horizontal">
              {showLibrary && (
                <>
                  <ResizablePanel defaultSize={16} minSize={12} maxSize={28}>
                    <BlockLibrarySidebar />
                  </ResizablePanel>
                  <ResizableHandle withHandle className="bg-cyan-400/15 hover:bg-cyan-400/30" />
                </>
              )}

              {showSettings && (
                <>
                  <ResizablePanel defaultSize={14} minSize={10} maxSize={24}>
                    <div className="h-full bg-gradient-to-b from-[#0f172a]/95 to-[#020617] border-r border-cyan-400/15 flex flex-col overflow-hidden">
                      <div className="p-4 border-b border-cyan-400/15 bg-cyan-500/5 flex-shrink-0">
                        <h3 className="text-sm font-semibold text-cyan-50 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-white text-xs">⚙</span>
                          Scene Settings
                        </h3>
                      </div>
                      <ScrollArea className="flex-1 min-h-0">
                        <VideoMetaEditor />
                      </ScrollArea>
                    </div>
                  </ResizablePanel>
                  <ResizableHandle withHandle className="bg-cyan-400/15 hover:bg-cyan-400/30" />
                </>
              )}

              <ResizablePanel defaultSize={showLibrary || showSettings || showProperties ? 50 : 100} minSize={30}>
                <VideoPreview />
              </ResizablePanel>

              {showProperties && (
                <>
                  <ResizableHandle withHandle className="bg-cyan-400/15 hover:bg-cyan-400/30" />
                  <ResizablePanel defaultSize={20} minSize={14} maxSize={35}>
                    <PropertiesPanel />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>

          {showTimeline && (
            <>
              <ResizableHandle withHandle className="bg-cyan-400/20 hover:bg-cyan-400/35" />
              <ResizablePanel defaultSize={28} minSize={18} maxSize={45}>
                <TimelineEditor />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
