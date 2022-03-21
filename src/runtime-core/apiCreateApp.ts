import { createVnode } from "./vnode";

export function createAppAPI (render){
  return (rootComponent) => {
    const app = {
      mount(container){ // 和平台无关的 mount 方法处理
        // 用户调用的 mount 方法
        
        const vnode = createVnode(rootComponent);
        render(vnode, container) // 核心逻辑是调用 render
        
      }
    }
    return app;
  }
}