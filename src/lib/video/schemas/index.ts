import { z } from 'zod';

// ============================================================================
// DATA LAYER - Input Schemas
// ============================================================================

/**
 * Intro/Outro configuration schema
 */
export const IntroOutroSchema = z.object({
  title: z.string().max(100).optional(),
  subtitle: z.string().max(200).optional(),
  logoUrl: z.string().url().optional(),
  duration: z.number().min(1).max(5).optional().default(2),
});

export type IntroOutroConfig = z.infer<typeof IntroOutroSchema>;

/**
 * Video metadata schema
 */
export const VideoMetaSchema = z.object({
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:5']).default('9:16'),
  theme: z.enum(['dark_modern', 'light_minimal', 'bold_vibrant', 'corporate']).default('dark_modern'),
  fps: z.number().int().min(24).max(60).default(30),
  intro: IntroOutroSchema.optional(),
  outro: IntroOutroSchema.optional(),
});

export type VideoMeta = z.infer<typeof VideoMetaSchema>;

/**
 * Stat content block schema
 */
export const StatBlockSchema = z.object({
  type: z.literal('stat'),
  heading: z.string().min(1).max(100),
  value: z.string().min(1).max(50),
  subtext: z.string().optional(),
});

export type StatBlock = z.infer<typeof StatBlockSchema>;

/**
 * Comparison item schema
 */
export const ComparisonItemSchema = z.object({
  label: z.string().min(1).max(50),
  value: z.number().min(0),
  color: z.string().optional(),
});

export type ComparisonItem = z.infer<typeof ComparisonItemSchema>;

/**
 * Comparison content block schema
 */
export const ComparisonBlockSchema = z.object({
  type: z.literal('comparison'),
  title: z.string().min(1).max(100).optional(),
  items: z.array(ComparisonItemSchema).min(2).max(6),
});

export type ComparisonBlock = z.infer<typeof ComparisonBlockSchema>;

/**
 * Text content block schema
 */
export const TextBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string().min(1).max(500),
  emphasis: z.enum(['low', 'medium', 'high']).optional(),
});

export type TextBlock = z.infer<typeof TextBlockSchema>;

/**
 * Image content block schema
 */
export const ImageBlockSchema = z.object({
  type: z.literal('image'),
  src: z.string().url(),
  alt: z.string().max(200).optional(),
  caption: z.string().max(100).optional(),
});

export type ImageBlock = z.infer<typeof ImageBlockSchema>;

/**
 * Quote content block schema
 */
export const QuoteBlockSchema = z.object({
  type: z.literal('quote'),
  text: z.string().min(1).max(300),
  author: z.string().max(100).optional(),
});

export type QuoteBlock = z.infer<typeof QuoteBlockSchema>;

/**
 * List content block schema
 */
export const ListBlockSchema = z.object({
  type: z.literal('list'),
  title: z.string().min(1).max(100).optional(),
  items: z.array(z.string().min(1).max(200)).min(1).max(10),
  style: z.enum(['bullet', 'numbered', 'checkmarks']).optional().default('bullet'),
});

export type ListBlock = z.infer<typeof ListBlockSchema>;

/**
 * Timeline event schema
 */
export const TimelineEventSchema = z.object({
  year: z.string().max(20),
  title: z.string().min(1).max(100),
  description: z.string().max(200).optional(),
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

/**
 * Timeline content block schema
 */
export const TimelineBlockSchema = z.object({
  type: z.literal('timeline'),
  title: z.string().min(1).max(100).optional(),
  events: z.array(TimelineEventSchema).min(2).max(8),
});

export type TimelineBlock = z.infer<typeof TimelineBlockSchema>;

/**
 * Callout content block schema
 */
export const CalloutBlockSchema = z.object({
  type: z.literal('callout'),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(300),
  variant: z.enum(['success', 'warning', 'info', 'default']).optional().default('default'),
});

export type CalloutBlock = z.infer<typeof CalloutBlockSchema>;

/**
 * Icon item schema for icon-list
 */
export const IconItemSchema = z.object({
  icon: z.string().min(1).max(50),
  title: z.string().min(1).max(100),
  description: z.string().max(200).optional(),
});

export type IconItem = z.infer<typeof IconItemSchema>;

/**
 * Icon List content block schema
 */
export const IconListBlockSchema = z.object({
  type: z.literal('icon-list'),
  title: z.string().min(1).max(100).optional(),
  items: z.array(IconItemSchema).min(1).max(6),
});

export type IconListBlock = z.infer<typeof IconListBlockSchema>;

/**
 * Line Chart content block schema
 */
export const LineChartBlockSchema = z.object({
  type: z.literal('line-chart'),
  title: z.string().min(1).max(100).optional(),
  data: z.array(z.number()).min(2).max(24),
  labels: z.array(z.string().max(20)).min(2).max(24).optional(),
  lineColor: z.string().optional(),
});

export type LineChartBlock = z.infer<typeof LineChartBlockSchema>;

/**
 * Pie Chart segment schema
 */
export const PieSegmentSchema = z.object({
  label: z.string().min(1).max(50),
  value: z.number().min(0),
  color: z.string().optional(),
});

export type PieSegment = z.infer<typeof PieSegmentSchema>;

/**
 * Pie Chart content block schema
 */
export const PieChartBlockSchema = z.object({
  type: z.literal('pie-chart'),
  title: z.string().min(1).max(100).optional(),
  segments: z.array(PieSegmentSchema).min(2).max(8),
});

export type PieChartBlock = z.infer<typeof PieChartBlockSchema>;

/**
 * Code content block schema
 */
export const CodeBlockSchema = z.object({
  type: z.literal('code'),
  code: z.string().min(1).max(2000),
  language: z.string().max(50).optional().default('javascript'),
  title: z.string().max(100).optional(),
});

export type CodeBlock = z.infer<typeof CodeBlockSchema>;

/**
 * Testimonial content block schema
 */
export const TestimonialBlockSchema = z.object({
  type: z.literal('testimonial'),
  quote: z.string().min(1).max(400),
  author: z.string().min(1).max(100),
  role: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  avatar: z.string().url().optional(),
});

export type TestimonialBlock = z.infer<typeof TestimonialBlockSchema>;

// ============================================================================
// WHATSAPP CHAT BLOCK SCHEMA
// ============================================================================

/**
 * WhatsApp chat participant schema
 */
export const WhatsAppParticipantSchema = z.object({
  name: z.string().min(1).max(50),
  avatar: z.string().optional(), // URL or placeholder
  isOnline: z.boolean().optional().default(true),
});

export type WhatsAppParticipant = z.infer<typeof WhatsAppParticipantSchema>;

/**
 * WhatsApp chat message schema
 */
export const WhatsAppMessageSchema = z.object({
  from: z.enum(['person1', 'person2']), // person1 = sender (right/green), person2 = receiver (left/white)
  text: z.string().min(1).max(500),
  time: z.string().max(20).optional(), // e.g., "10:30 AM"
  showReadReceipt: z.boolean().optional().default(true),
});

export type WhatsAppMessage = z.infer<typeof WhatsAppMessageSchema>;

/**
 * WhatsApp chat content block schema
 */
export const WhatsAppChatBlockSchema = z.object({
  type: z.literal('whatsapp-chat'),
  title: z.string().min(1).max(100).optional(), // Chat title/header override
  person1: WhatsAppParticipantSchema, // "You" - sender (right side, green bubbles)
  person2: WhatsAppParticipantSchema, // Other person (left side, white bubbles)
  messages: z.array(WhatsAppMessageSchema).min(1).max(50), // Up to 50 messages supported
  showTypingIndicator: z.boolean().optional().default(true), // Show typing before first message
  lastSeen: z.string().max(50).optional(), // e.g., "last seen today at 10:30 AM"
});

export type WhatsAppChatBlock = z.infer<typeof WhatsAppChatBlockSchema>;

/**
 * Union type for all content blocks
 */
export const ContentBlockSchema = z.discriminatedUnion('type', [
  StatBlockSchema,
  ComparisonBlockSchema,
  TextBlockSchema,
  ImageBlockSchema,
  QuoteBlockSchema,
  ListBlockSchema,
  TimelineBlockSchema,
  CalloutBlockSchema,
  IconListBlockSchema,
  LineChartBlockSchema,
  PieChartBlockSchema,
  CodeBlockSchema,
  TestimonialBlockSchema,
  WhatsAppChatBlockSchema,
]);

export type ContentBlock = z.infer<typeof ContentBlockSchema>;

/**
 * Complete video input schema
 */
export const VideoInputSchema = z.object({
  videoMeta: VideoMetaSchema,
  contentBlocks: z.array(ContentBlockSchema).min(1).max(20),
});

export type VideoInput = z.infer<typeof VideoInputSchema>;

// ============================================================================
// INTELLIGENCE LAYER - AI Decision Schemas
// ============================================================================

/**
 * Motion profile types
 */
export const MotionProfileSchema = z.enum(['subtle', 'dynamic', 'energetic']);
export type MotionProfile = z.infer<typeof MotionProfileSchema>;

/**
 * Animation sequence phases
 */
export const AnimationPhaseSchema = z.object({
  enter: z.number().min(0).max(5),    // Duration in seconds
  hold: z.number().min(0).max(55),    // Duration in seconds (increased for long chats)
  exit: z.number().min(0).max(5),     // Duration in seconds
});

export type AnimationPhase = z.infer<typeof AnimationPhaseSchema>;

/**
 * AI Decision output for a single content block
 */
export const AIDecisionSchema = z.object({
  componentId: z.string(),
  motionProfile: MotionProfileSchema,
  duration: z.number().min(1).max(60), // Increased max for long chat conversations
  animation: AnimationPhaseSchema.optional(),
  props: z.record(z.unknown()).optional(),
});

export type AIDecision = z.infer<typeof AIDecisionSchema>;

/**
 * Complete video plan from AI
 */
export const VideoPlanSchema = z.object({
  decisions: z.array(AIDecisionSchema),
  totalDuration: z.number(),
  suggestedTransitions: z.array(z.enum(['fade', 'slide', 'zoom', 'wipe'])).optional(),
});

export type VideoPlan = z.infer<typeof VideoPlanSchema>;

// ============================================================================
// RENDER LAYER - Component Registry
// ============================================================================

/**
 * Component registry entry
 */
export const ComponentRegistryEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  supportedTypes: z.array(z.string()),
  defaultDuration: z.number(),
  defaultProps: z.record(z.unknown()).optional(),
});

export type ComponentRegistryEntry = z.infer<typeof ComponentRegistryEntrySchema>;

/**
 * Available component IDs
 */
export const COMPONENT_IDS = {
  INTRO: 'intro',
  OUTRO: 'outro',
  STAT: 'stat-scene',
  COMPARISON: 'comparison-scene',
  TEXT: 'text-scene',
  QUOTE: 'quote-scene',
  IMAGE: 'image-scene',
  LIST: 'list-scene',
  TIMELINE: 'timeline-scene',
  CALLOUT: 'callout-scene',
  ICON_LIST: 'icon-list-scene',
  LINE_CHART: 'line-chart-scene',
  PIE_CHART: 'pie-chart-scene',
  CODE: 'code-scene',
  TESTIMONIAL: 'testimonial-scene',
  WHATSAPP_CHAT: 'whatsapp-chat-scene',
} as const;

export type ComponentId = typeof COMPONENT_IDS[keyof typeof COMPONENT_IDS];

/**
 * Mapping of content types to supported components
 */
export const TYPE_TO_COMPONENT_MAP: Record<string, ComponentId[]> = {
  stat: [COMPONENT_IDS.STAT],
  comparison: [COMPONENT_IDS.COMPARISON],
  text: [COMPONENT_IDS.TEXT],
  image: [COMPONENT_IDS.IMAGE],
  quote: [COMPONENT_IDS.QUOTE],
  list: [COMPONENT_IDS.LIST],
  timeline: [COMPONENT_IDS.TIMELINE],
  callout: [COMPONENT_IDS.CALLOUT],
  'icon-list': [COMPONENT_IDS.ICON_LIST],
  'line-chart': [COMPONENT_IDS.LINE_CHART],
  'pie-chart': [COMPONENT_IDS.PIE_CHART],
  code: [COMPONENT_IDS.CODE],
  testimonial: [COMPONENT_IDS.TESTIMONIAL],
  'whatsapp-chat': [COMPONENT_IDS.WHATSAPP_CHAT],
};
