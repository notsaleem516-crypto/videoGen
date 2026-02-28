import { parentPort } from 'worker_threads';
import { calculateCompositionConfig, generateVideoPlan } from './render-prep';

if (!parentPort) {
  throw new Error('prep-worker started without parentPort');
}

parentPort.on('message', async (payload: { input: any; title: string; subtitle: string }) => {
  try {
    const { input, title, subtitle } = payload;
    const plan = await generateVideoPlan(input.videoMeta, input.contentBlocks);
    const compositionConfig = calculateCompositionConfig(input);
    const props = { input, plan, title, subtitle };
    parentPort?.postMessage({ ok: true, plan, compositionConfig, props });
  } catch (error) {
    parentPort?.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown prep worker error',
    });
  }
});
