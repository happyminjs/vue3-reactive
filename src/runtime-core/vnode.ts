import { isString, ShapeFlags, isObject, isArray } from '../shared/index';


export function createVnode(type, props:any={}, children=null){
  // type 是什么类型：  对象或者字符串，即组件或者tag
  const shapeFlag = isString(type) ? ShapeFlags.ELEMENT : (isObject(type) ? ShapeFlags.STATEFUL_COMPONENT : 0);

  const vnode = { // 虚拟节点可以用来表示dom结构，也可以用来表示组件
    type,
    props,
    children,
    component: null, // 组件实例
    el: null, // 虚拟节点要和真实节点做一个映射关系
    key: props.key,
    shapeFlag, // vue3中一个非常优秀的做法，  虚拟节点的类型  元素、组件、
  }
  if(isArray(children)) {
    // 1
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN; // 如果在或的过程中有一个是1就是1， 把良哥数相加
  } else {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  }
  return vnode
}