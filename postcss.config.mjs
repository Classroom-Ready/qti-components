import autoprefixer from 'autoprefixer';
import postcssApply from 'postcss-class-apply/dist/index.js';
import postcssImport from 'postcss-import';
import postcssNesting from 'postcss-nesting';
export default {
  plugins: [
    postcssImport(), // This should be first
    postcssNesting(),
    postcssApply(),
    autoprefixer()
  ]
};
