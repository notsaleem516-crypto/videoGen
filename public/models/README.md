# Custom 3D Models

This folder is for storing custom GLB/GLTF 3D models that can be used in the Tower Chart 3D scene.

## How to Use

1. Upload your GLB file to this folder
2. In the Tower Chart 3D block settings, set the `customModelPath` to `/models/your-model.glb`
3. The model will be rendered in the background of your 3D scene

## Supported Formats

- GLB (recommended) - Binary glTF format
- GLTF - Text-based glTF format

## Recommended Model Specs

- **Polygon Count**: Keep under 50k triangles for smooth performance
- **Textures**: Embedded textures work best with GLB format
- **Scale**: Models are automatically scaled, but units should be in meters
- **Materials**: PBR materials supported (metalness, roughness)

## Free Model Sources

- [Sketchfab](https://sketchfab.com) - Filter by "Downloadable" and "Free"
- [Poly Pizza](https://poly.pizza) - Free low-poly models
- [Mixamo](https://mixamo.com) - Free animated characters
- [Quaternius](https://quaternius.com) - Free low-poly assets

## Example Usage

```typescript
{
  type: 'tower-chart-3d',
  title: 'Top Video Games',
  customModelPath: '/models/gaming-console.glb',
  items: [...]
}
```

## Notes

- Models are loaded asynchronously, so they may take a moment to appear
- Large models may affect rendering performance
- The model floats and rotates subtly in the background
