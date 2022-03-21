import { nodeOps } from "./nodeOps";
import { patchProp } from './patchProp'
import { createRenderer } from '../runtime-core/index'


const renderOptions = { // dom 操作
  ...nodeOps
}

function ensureRenderer(){
  return createRenderer(renderOptions);
}

// createApp(App).mount('#app')
export function createApp(rootComponent){
  console.log(rootComponent)
  // 1. 根据组件 创建一个渲染器
  // app 是对外暴露的
  const app = ensureRenderer().createApp(rootComponent);
  const { mount } = app;
  app.mount = function(container){
    // 1. 挂载时需要先将容器清空，再进行挂载
    container = document.querySelector(container)
    container.innerHTML = '';
    mount(container)
  }
  // 2.

  return app;
}