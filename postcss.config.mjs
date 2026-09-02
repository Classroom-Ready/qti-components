import autoprefixer from 'autoprefixer';
import postcssImport from 'postcss-import';
import postcssMixins from 'postcss-mixins';

import customStateFallback from './tools/postcss/custom-state-fallback.mjs';

export default {
  plugins: [
    postcssImport(), // This should be first: inlines every @import into one stream so mixin
    // definitions (in qti-base) precede their uses (in the interaction files).
    postcssMixins(),
    // Pairs every `:state(x)` with a `[data-state~='x']` arm, for browsers whose
    // CSS parser drops `:state()` — see the plugin header.
    customStateFallback(),
    autoprefixer()
  ]
};
