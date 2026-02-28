'use client';

import { useEditorStore } from '@/store/editor-store';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Video, Play, Sparkles, Maximize2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Player } from '@remotion/player';
import { DynamicVideo, getCompositionConfig } from '@/lib/video/compositions/DynamicVideo';
import { type VideoPlan, type AIDecision, COMPONENT_IDS } from '@/lib/video/schemas';
import { motion, AnimatePresence } from 'framer-motion';

function generatePlanFromBlocks(videoInput: { contentBlocks: Array<{ type: string; duration?: number }> }): VideoPlan {
  const typeToComponentId: Record<string, string> = {
    'stat': COMPONENT_IDS.STAT,
    'comparison': COMPONENT_IDS.COMPARISON,
    'text': COMPONENT_IDS.TEXT,
    'image': COMPONENT_IDS.IMAGE,
    'quote': COMPONENT_IDS.QUOTE,
    'list': COMPONENT_IDS.LIST,
    'timeline': COMPONENT_IDS.TIMELINE,
    'callout': COMPONENT_IDS.CALLOUT,
    'icon-list': COMPONENT_IDS.ICON_LIST,
    'line-chart': COMPONENT_IDS.LINE_CHART,
    'pie-chart': COMPONENT_IDS.PIE_CHART,
    'code': COMPONENT_IDS.CODE,
    'testimonial': COMPONENT_IDS.TESTIMONIAL,
    'whatsapp-chat': COMPONENT_IDS.WHATSAPP_CHAT,
    'motivational-image': COMPONENT_IDS.MOTIVATIONAL_IMAGE,
    // New blocks
    'counter': COMPONENT_IDS.COUNTER,
    'progress-bar': COMPONENT_IDS.PROGRESS_BAR,
    'qr-code': COMPONENT_IDS.QR_CODE,
    'video': COMPONENT_IDS.VIDEO,
    'avatar-grid': COMPONENT_IDS.AVATAR_GRID,
    'social-stats': COMPONENT_IDS.SOCIAL_STATS,
    'cta': COMPONENT_IDS.CTA,
    'gradient-text': COMPONENT_IDS.GRADIENT_TEXT,
    'animated-bg': COMPONENT_IDS.ANIMATED_BG,
    'countdown': COMPONENT_IDS.COUNTDOWN,
    'weather-block': COMPONENT_IDS.WEATHER,
    'tower-chart-3d': COMPONENT_IDS.TOWER_CHART_3D,
  };

  const decisions: AIDecision[] = videoInput.contentBlocks.map((block) => {
    const duration = block.duration || getDefaultDuration(block.type);
    return {
      componentId: typeToComponentId[block.type] || COMPONENT_IDS.TEXT,
      motionProfile: 'dynamic' as const,
      duration,
      animation: { enter: 0.4, hold: duration - 0.6, exit: 0.2 },
    };
  });

  return {
    decisions,
    totalDuration: decisions.reduce((sum, d) => sum + d.duration, 0),
    suggestedTransitions: decisions.map(() => 'fade' as const),
  };
}

function getDefaultDuration(type: string): number {
  const durations: Record<string, number> = {
    'stat': 3, 'comparison': 4, 'text': 3, 'image': 4, 'quote': 4, 'list': 5,
    'timeline': 6, 'callout': 3, 'icon-list': 5, 'line-chart': 5, 'pie-chart': 5,
    'code': 6, 'testimonial': 5, 'whatsapp-chat': 8, 'motivational-image': 6,
    // New blocks
    'counter': 4, 'progress-bar': 3, 'qr-code': 4, 'video': 5,
    'avatar-grid': 5, 'social-stats': 4, 'cta': 3, 'gradient-text': 4,
    'animated-bg': 5, 'countdown': 4, 'weather-block': 4, 'tower-chart-3d': 20,
  };
  return durations[type] || 4;
}

export function VideoPreview() {
  const { videoInput, exportVideo } = useEditorStore();
  const [isExporting, setIsExporting] = useState(false);

  const plan = useMemo(() => generatePlanFromBlocks(videoInput), [videoInput]);
  const config = useMemo(() => {
    if (videoInput.contentBlocks.length === 0) return null;
    return getCompositionConfig(videoInput, plan);
  }, [videoInput, plan]);

  const handleExport = async () => {
    if (videoInput.contentBlocks.length === 0) return;
    setIsExporting(true);
    try {
      const blob = await exportVideo();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-${Date.now()}.mp4`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getPreviewDimensions = () => {
    const ratio = videoInput.videoMeta.aspectRatio;
    switch (ratio) {
      case '9:16': return { width: 280, height: 498 };
      case '16:9': return { width: 498, height: 280 };
      case '1:1': return { width: 380, height: 380 };
      case '4:5': return { width: 380, height: 475 };
      default: return { width: 280, height: 498 };
    }
  };

  const previewDims = getPreviewDimensions();

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 min-h-0 overflow-hidden">
      {/* Header Bar */}
      <div className="h-14 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50 flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Play className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white">Preview</span>
            {config && (
              <span className="text-xs text-gray-500 ml-2">
                {videoInput.videoMeta.aspectRatio} • {plan.totalDuration.toFixed(1)}s
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800/50 border border-gray-700/50">
            <span className="text-xs text-gray-400">{videoInput.contentBlocks.length} blocks</span>
          </div>
          <Button
            size="sm"
            className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-white border-0 shadow-lg shadow-cyan-500/25"
            onClick={handleExport}
            disabled={isExporting || videoInput.contentBlocks.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rendering...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export MP4
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden min-h-0 relative">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(75 85 99 / 0.5) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />
        
        <AnimatePresence mode="wait">
          {videoInput.contentBlocks.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center relative z-10"
            >
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center mx-auto mb-6 border border-gray-700/50 shadow-2xl">
                <Video className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Blocks Added</h3>
              <p className="text-gray-500 text-sm max-w-xs">
                Click blocks in the library to add them to your video timeline
              </p>
            </motion.div>
          ) : config ? (
            <motion.div 
              key="player"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10"
            >
              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-cyan-500/20 blur-2xl opacity-50" />
              
              {/* Player Container */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 bg-black">
                {/* Phone Frame Effect */}
                <div className="absolute inset-0 pointer-events-none border-4 border-gray-800/50 rounded-2xl" />
                
                <Player
                  component={DynamicVideo}
                  inputProps={{ input: videoInput, plan }}
                  durationInFrames={config.durationInFrames}
                  compositionWidth={config.width}
                  compositionHeight={config.height}
                  fps={config.fps}
                  style={{
                    width: previewDims.width,
                    height: previewDims.height,
                  }}
                  controls
                  loop
                  autoPlay
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      
      {/* Info Bar */}
      <div className="h-10 bg-gray-900/50 backdrop-blur border-t border-gray-800/50 flex items-center justify-center flex-shrink-0">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            {videoInput.videoMeta.theme}
          </span>
          <span>{videoInput.videoMeta.fps} FPS</span>
          <span className="text-gray-600">|</span>
          <span>{videoInput.videoMeta.aspectRatio}</span>
        </div>
      </div>
    </div>
  );
}
