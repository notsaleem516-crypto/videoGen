export { default as Scene } from './Scene';
export { default as Editor } from './Editor';
export { default as manifest } from '../plugin.json';
export { default as schema } from '../schema.json';

import type { PluginDefinition } from '../../../shared/plugin-types';
import Scene from './Scene';
import Editor from './Editor'
import manifest from '../plugin.json'
import schema from '../schema.json'

export const plugin: PluginDefinition = {
  id: manifest.id,
  name: manifest.name,
  version: manifest.version,
  category: manifest.category,
  icon: manifest.icon,
  color: manifest.color,
  description: manifest.description,
  
  scene: Scene,
  editor: Editor,
  
  schema: schema
  defaults: schema.defaults || {},
  
  remotion: manifest.remotion
  features: manifest.features
};

export default plugin;
