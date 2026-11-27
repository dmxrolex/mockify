import { defineConfig } from 'vite';

export default defineConfig({
  worker:{format:'es'},
  // Pre-bundling moves the polyfill away from its stylesheet; serve it in place in development.
  optimizeDeps:{exclude:['input-switch-polyfill']},
  plugins:[{
    name:'bundle-switch-stylesheet',enforce:'pre',
    transform(code,id){
      if(id.replaceAll('\\','/').endsWith('/input-switch-polyfill/input-switch-polyfill.js'))return code.replace("import.meta.resolve('./input-switch-polyfill.css')","new URL('./input-switch-polyfill.css',import.meta.url).href");
    },
  }],
});
