# EZPZ Rubber duck

A standalone 3D rubber toy on responsive water. Hold the duck to compress it, drag to move it, and release to let it recover and bob. Touch the water to create ripples. There are no visible controls or words.

## Customize

Import `RubberDuck` and `style.css` into a React app. Give its parent a defined height. Props: `color` (default `#ffd000`), `sound` (default `true`), `initialYaw` (default `-0.52` radians), and `className`. Set `sound={false}` to disable the gesture-triggered synthesized squeak.

Edit material and deformation in `src/duck-model.ts`, buoyancy and compression in `src/rubber-duck.tsx`, and wave appearance in `src/water.ts`.

## Behavior and accessibility

The scene uses fixed-step spring dynamics, a body compression morph, damped translation and rocking, propagating water normals and a softened planar reflection. It is a stylized real-time simulation, not a fluid or finite-element solver. Keyboard focus supports Space or Enter to squeeze, and arrow keys to move. Reduced motion stops ambient movement after settling. WebGL is required; a concise fallback appears if it is unavailable.

## Provenance

The model uses the licensed SCEA Duck from the Khronos sample collection, with native mesh refinement, a new rubber material, compression deformation and water interactions. No generative AI is used. See `THIRD_PARTY.md` and `licenses/SCEA.txt` for attribution, modifications and asset license.

## Run and edit

Requires Node.js 20.19+ or 22.12+. Run `npm ci`, then `npm run dev`. Run `npm run build` for production. The standalone HTML in `delivery` includes its assets and opens without installation.

This is an independent project with its own dependencies, source, and entry point. It has no shared project files or navigation. MIT-licensed application code; the included duck asset uses the SCEA Shared Source License 1.0. Third-party dependencies retain their licenses.
