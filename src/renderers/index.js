// Renderer entrypoint
// Export the default three-based renderer factory. Other renderer implementations
// can be added here and selected by name in the future.
import { createThreeRenderer } from './threeRenderer';
import { createCustomRenderer } from './customRenderer';

export { createThreeRenderer, createCustomRenderer };
