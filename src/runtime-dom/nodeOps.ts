import { patchProp } from "./patchProp"

export const nodeOps = {
  createElement(type){
    return document.createElement(type)
  },
  patchProp(el, key, pre, next){
    patchProp(el, key, pre, next)
  },
  setElementText(el, text){
    el.textContent = text
  },
  insert(child, parent, anchor = null){
    parent.insertBefore(child, anchor);
    // 将 child 插入到 anchor 的前边，
    // anchor 为空时，等价于 parent.appendChild(child)
  },
  remove(child){
    const parent = child.parentNode
    if(parent){
      parent.removeChild(child)
    }
  }
}