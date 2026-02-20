'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Player } from '@remotion/player';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  Sparkles, 
  Video, 
  Settings, 
  Code, 
  Zap,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  FileVideo,
  Copy,
  Terminal,
} from 'lucide-react';
import { DynamicVideo } from '@/lib/video/compositions/DynamicVideo';
import { 
  type VideoInput, 
  type VideoPlan,
  VideoInputSchema,
} from '@/lib/video/schemas';

// ============================================================================
// DEFAULT SAMPLE DATA
// ============================================================================

const DEFAULT_INPUT: VideoInput = {
  videoMeta: {
    aspectRatio: '9:16',
    theme: 'dark_modern',
    fps: 30,
  },
  contentBlocks: [
    {
      type: 'whatsapp-chat',
      person1: {
        name: 'You',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        isOnline: true,
      },
      person2: {
        name: 'Sarah Johnson',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
        isOnline: true,
      },
      messages: [
        { from: 'person2', text: 'Hey! Did you see the new project updates?', time: '10:30 AM' },
        { from: 'person1', text: 'Yes! The results look amazing 🎉', time: '10:31 AM' },
        { from: 'person2', text: 'Revenue is up 400K this quarter!', time: '10:32 AM' },
        { from: 'person1', text: 'That\'s incredible! Great work everyone 💪', time: '10:33 AM' },
        { from: 'person2', text: 'Let\'s celebrate this win! 🚀', time: '10:34 AM' },
      ],
      showTypingIndicator: true,
      lastSeen: 'online',
    },
    {
      type: 'stat',
      heading: 'Revenue',
      value: '400K',
      subtext: 'Year over year growth',
    },
  ],
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function VideoEnginePage() {
  const [input, setInput] = useState<VideoInput>(DEFAULT_INPUT);
  const [plan, setPlan] = useState<VideoPlan | null>(null);
  const [renderData, setRenderData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState(JSON.stringify(DEFAULT_INPUT, null, 2));
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');

  // Generate video plan
  const generatePlan = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setRenderData(null);
    
    try {
      // Parse and validate JSON
      const parsed = JSON.parse(jsonInput);
      const validated = VideoInputSchema.parse(parsed);
      setInput(validated);
      
      // Call API
      const response = await fetch('/api/video/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate plan');
      }
      
      setPlan(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [jsonInput]);

  // Generate render data
  const generateRenderData = useCallback(async () => {
    setIsRendering(true);
    setError(null);
    
    try {
      const parsed = JSON.parse(jsonInput);
      const validated = VideoInputSchema.parse(parsed);
      
      const response = await fetch('/api/video/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validated,
          quality,
          returnFile: false,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate render data');
      }
      
      setRenderData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsRendering(false);
    }
  }, [jsonInput, quality]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  // Update video meta
  const updateMeta = useCallback((key: string, value: string | number) => {
    setInput(prev => ({
      ...prev,
      videoMeta: {
        ...prev.videoMeta,
        [key]: value,
      },
    }));
    setJsonInput(prev => {
      const parsed = JSON.parse(prev);
      parsed.videoMeta[key] = value;
      return JSON.stringify(parsed, null, 2);
    });
  }, []);

  // Composition config for player
  const compositionConfig = useMemo(() => {
    if (!plan) {
      return {
        durationInFrames: 150,
        fps: 30,
        width: 1080,
        height: 1920,
      };
    }
    
    const aspectRatios: Record<string, { width: number; height: number }> = {
      '16:9': { width: 1920, height: 1080 },
      '9:16': { width: 1080, height: 1920 },
      '1:1': { width: 1080, height: 1080 },
      '4:5': { width: 1080, height: 1350 },
    };
    
    const dimensions = aspectRatios[input.videoMeta.aspectRatio] || aspectRatios['9:16'];
    const introDuration = 2;
    const outroDuration = 2;
    const totalDuration = introDuration + plan.totalDuration + outroDuration;
    
    return {
      durationInFrames: Math.round(totalDuration * input.videoMeta.fps),
      fps: input.videoMeta.fps,
      width: dimensions.width,
      height: dimensions.height,
    };
  }, [plan, input.videoMeta]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Dynamic Video Engine</h1>
                <p className="text-sm text-muted-foreground">AI-Powered Video Generation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Zap className="w-3 h-3" />
                Physics-Based
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="w-3 h-3" />
                AI Routing
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Controls */}
          <div className="space-y-6">
            {/* Quick Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Video Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Aspect Ratio</Label>
                  <Select
                    value={input.videoMeta.aspectRatio}
                    onValueChange={(v) => updateMeta('aspectRatio', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9:16">9:16</SelectItem>
                      <SelectItem value="16:9">16:9</SelectItem>
                      <SelectItem value="1:1">1:1</SelectItem>
                      <SelectItem value="4:5">4:5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select
                    value={input.videoMeta.theme}
                    onValueChange={(v) => updateMeta('theme', v)}
                  >
                    <SelectTrigger>
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
                
                <div className="space-y-2">
                  <Label>FPS</Label>
                  <Select
                    value={String(input.videoMeta.fps)}
                    onValueChange={(v) => updateMeta('fps', Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 FPS</SelectItem>
                      <SelectItem value="30">30 FPS</SelectItem>
                      <SelectItem value="60">60 FPS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quality</Label>
                  <Select
                    value={quality}
                    onValueChange={(v) => setQuality(v as 'low' | 'medium' | 'high')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* JSON Editor */}
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Code className="w-5 h-5" />
                    Content Blocks
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={generateRenderData}
                      disabled={isRendering}
                      variant="outline"
                      className="gap-2"
                    >
                      {isRendering ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileVideo className="w-4 h-4" />
                      )}
                      Get Render Data
                    </Button>
                    <Button
                      onClick={generatePlan}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Generate Plan
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Edit the JSON below to define your video content blocks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="font-mono text-sm min-h-[250px] resize-y"
                  placeholder="Enter JSON video input..."
                />
                
                {error && (
                  <div className="mt-3 flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Plan Results */}
            {plan && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    AI Decision Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[180px]">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Duration</span>
                        <span className="font-mono">{plan.totalDuration.toFixed(1)}s</span>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">Scene Decisions</span>
                        {plan.decisions.map((decision, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {index + 1}
                              </Badge>
                              <span className="text-sm">{decision.componentId}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={
                                  decision.motionProfile === 'energetic' ? 'default' :
                                  decision.motionProfile === 'dynamic' ? 'secondary' : 'outline'
                                }
                                className="text-xs"
                              >
                                {decision.motionProfile}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-mono">
                                {decision.duration}s
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Render Data */}
            {renderData && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-primary" />
                    Render Data
                  </CardTitle>
                  <CardDescription>
                    Use this data to render the video with Remotion CLI
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-muted">
                        <div className="font-mono">{String(renderData.renderConfig?.resolution)}</div>
                        <div className="text-muted-foreground">Resolution</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted">
                        <div className="font-mono">{String(renderData.renderConfig?.estimatedDuration)}</div>
                        <div className="text-muted-foreground">Duration</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted">
                        <div className="font-mono">{String(renderData.processingTime)}</div>
                        <div className="text-muted-foreground">Process Time</div>
                      </div>
                    </div>

                    <Separator />

                    {/* Render Command */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Remotion CLI Command</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(String(renderData.renderCommands?.remotion || ''))}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 font-mono text-xs break-all max-h-[100px] overflow-y-auto">
                        {String(renderData.renderCommands?.remotion)}
                      </div>
                    </div>

                    {/* Props JSON */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Composition Props</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(renderData.props, null, 2))}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <ScrollArea className="h-[150px]">
                        <pre className="p-3 rounded-lg bg-muted/50 font-mono text-xs">
                          {JSON.stringify(renderData.props, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Video Preview
                </CardTitle>
                <CardDescription>
                  Real-time preview with Remotion Player
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative rounded-xl overflow-hidden bg-black/5 aspect-[9/16] max-h-[500px] mx-auto">
                  {plan ? (
                    <Player
                      component={DynamicVideo}
                      inputProps={{ input, plan }}
                      durationInFrames={compositionConfig.durationInFrames}
                      compositionWidth={compositionConfig.width}
                      compositionHeight={compositionConfig.height}
                      fps={compositionConfig.fps}
                      style={{
                        width: '100%',
                        height: '100%',
                      }}
                      controls
                      loop
                      autoPlay
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                      <Video className="w-16 h-16 mb-4 opacity-50" />
                      <p className="text-sm">Click "Generate Plan" to preview</p>
                    </div>
                  )}
                </div>
                
                {/* Composition Info */}
                {plan && (
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-muted">
                      <div className="font-mono">{compositionConfig.width}×{compositionConfig.height}</div>
                      <div className="text-muted-foreground">Resolution</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted">
                      <div className="font-mono">{compositionConfig.fps}</div>
                      <div className="text-muted-foreground">FPS</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted">
                      <div className="font-mono">{(compositionConfig.durationInFrames / compositionConfig.fps).toFixed(1)}s</div>
                      <div className="text-muted-foreground">Duration</div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted">
                      <div className="font-mono">{plan.decisions.length}</div>
                      <div className="text-muted-foreground">Scenes</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* API Endpoints */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">API Endpoints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" className="text-xs">POST</Badge>
                    <code className="text-sm font-mono">/api/video/plan</code>
                  </div>
                  <p className="text-xs text-muted-foreground">Generate AI decision plan from content blocks</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" className="text-xs">POST</Badge>
                    <code className="text-sm font-mono">/api/video/render</code>
                  </div>
                  <p className="text-xs text-muted-foreground">Get render data and Remotion CLI commands</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">GET</Badge>
                    <code className="text-sm font-mono">/api/video/plan</code>
                  </div>
                  <p className="text-xs text-muted-foreground">Get schema documentation and examples</p>
                </div>
              </CardContent>
            </Card>

            {/* Architecture Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">System Architecture</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Data Layer</div>
                    <div className="text-xs text-muted-foreground mt-1">JSON + Zod Validation</div>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="text-sm font-medium text-purple-600 dark:text-purple-400">Intelligence</div>
                    <div className="text-xs text-muted-foreground mt-1">AI Decision Router</div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="text-sm font-medium text-green-600 dark:text-green-400">Render Layer</div>
                    <div className="text-xs text-muted-foreground mt-1">Remotion + Springs</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto bg-card/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Scalable Dynamic Video Engine</span>
            <span>Data → AI Router → Remotion Render</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
