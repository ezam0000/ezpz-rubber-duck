# Duck asset provenance

The duck geometry and painted texture derive from the SCEA Duck model, distributed in the Khronos glTF Sample Assets collection.

Source: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Duck

Copyright 2005 Sony Computer Entertainment Inc. Licensed under the SCEA Shared Source License 1.0. Full terms are included in `licenses/SCEA.txt`. The model is not covered by this project's MIT code license. Original accompanying documentation is retained under `licenses`.

`src/assets/duck-original.glb` preserves the downloaded original. `src/assets/duck.glb` is the modified asset. Modifications: two passes of seam-aware Loop subdivision, smooth recomputed normals, and repackaging to glTF. `scripts/refine-duck.py` reproduces these changes with Python and NumPy. At runtime, `src/duck-model.ts` normalizes orientation and scale, adds a rubber material with configurable body color, and creates a body-compression morph with transformed normals. Original eye and bill paint is retained.

The interaction, buoyancy springs, audio synthesis, water shader and reflection integration are separately authored code. No generative AI was used for this duck.

Visual proportion references reviewed:

- https://schylling.com/product/rubber-duckies-yellow-classic/
- https://www.hobbyandtoycentral.com/products/classic-rubber-ducky
- https://toytooth.com/products/classic-yellow-rubber-ducky-by-schylling

Reference product photographs are not bundled or redistributed.
