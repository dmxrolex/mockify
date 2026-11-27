import { defineConfig } from 'vite';

export default defineConfig({
  worker:{format:'es'},
  plugins:[{
    name:'bundle-switch-stylesheet',enforce:'pre',
    transform(code,id){
      if(id.replaceAll('\\','/').endsWith('/input-switch-polyfill/input-switch-polyfill.js'))return code.replace("import.meta.resolve('./input-switch-polyfill.css')","new URL('./input-switch-polyfill.css',import.meta.url).href");
    },
  }],
});
