// Vitest setup: provide browser-like APIs not implemented in jsdom

// Mock ResizeObserver if not present
if (typeof global.ResizeObserver === 'undefined') {
  class ResizeObserver {
    constructor(cb) { this.cb = cb; }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserver;
}

// Provide a minimal HTMLCanvasElement.getContext implementation used by tests
if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = function () {
    // return a minimal mock WebGL or 2D context-like object used by renderers
    return {
      canvas: this,
      getExtension: () => null,
      getContextAttributes: () => ({}),
      createTexture: () => ({}),
      bindTexture: () => {},
      texImage2D: () => {},
      texParameteri: () => {},
      viewport: () => {},
      clear: () => {},
    };
  };
}

// Mock matchMedia for components that query media
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = function () {
    return { matches: false, addListener: () => {}, removeListener: () => {} };
  };
}
