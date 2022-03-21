import { ShapeFlags } from "../shared/shapeFlag";
import { createAppAPI } from "./apiCreateApp"; // 用户调用的 createAPP 方法
import { createComponentInstance, setupComponent } from "./component";
import { effect } from '../reactivity/effect';

export function createRenderer(options){ // options 是平台(web,wxapp)传过来的方法，不同平台可以实现不同的操作逻辑，
  return baseCreateRenderer(options);
}
function baseCreateRenderer(options){
  const { 
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    setElementText: hostSetElementText,
    insert: hostInsert,
    remove: hostRemove
  } = options
  const render = (vnode, container) => {
    // 需要将虚拟节点变成真实节点，挂载到容器上
    patch(null, vnode, container)

  }
  const mountElement = (vnode, container, anchor) => {
    let { shapeFlag, props } = vnode;
    let el = vnode.el = hostCreateElement(vnode.type)
    // 创建儿子节点
    if(shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, vnode.children)
    } else if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el);
    }
    if(props) { // 属性
      for(let key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }
    hostInsert(el, container, anchor)
  }
  const mountChildren = (children, container) => {
    for(let i = 0; i < children.length; i++) {
      patch(null, children[i], container)
    }
  }
  const patchProps = (oldProps, newProps, el) => {
    if(oldProps !== newProps) {
      // 新的需要覆盖老的属性
      for(let key in newProps) {
        const prev = oldProps[key]
        const next = newProps[key]
        if(prev != next) {
          hostPatchProp(el, key, prev, next)
        }
      }
      // 老的有的属性，新的没有， 将老的属性删除
      for(const key in oldProps){
        if(!(key in newProps)){
          hostPatchProp(el, key, oldProps[key], null)
        }
      }
    }
  }
  const patchKeyChildren = (c1, c2, el) => {
    // 内部优化策略
    // abc  i = 0
    // abde 
    let i = 0;
    let e1 = c1.length - 1; // 老儿子节点中最后一项的索引  2
    let e2 = c2.length - 1; // 新儿子节点中最后一项的索引  3
    // 1、先特殊情况：从头比较    处理最后增删的节点
    while( i <= e1 && i <= e2){ // 任意子节点循环完，则循环比对结束
      const n1 = c1[i];
      const n2 = c2[i];
      if(isSameVnodeType(n1, n2)){
        patch(n1, n2, el); // 递归比对子元素
      } else {
        break;
      }
      i++;
    }
    console.log('aaaaaaaaa', i, e1, e2)
    // 2、先特殊情况：从后往前比   处理开始增删的节点
    while(i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if(isSameVnodeType(n1, n2)) {
        patch(n1, n2, el)
      } else {
        break;
      }
      e1--;
      e2--;
    }
    console.log('rrr111', 0, 0, -1)
    // 3、特殊情况：只考虑元素在头或者尾，新增和删除的情况
    // abc -> abcd  i=3,e1=2,e2=3
    // abc -> dabc  i=0,e1=-1,e2=0
    // abcd -> abc  i=3,e1=3,e2=2
    if(i > e1) { // 只要 i 大于了 e1 表示是新增属性
      if(i <= e2){ // 表示有新增部分
        // 先根据 e2 取他的下一个元素 和 数组长度进行比较
        const nextPos = e2 + 1;
        // 如果有下一个，则说明是往前插入
        const anchor = nextPos < c2.length ? c2[nextPos].el : null;
        while(i <= e2){ // 将 c2 中剩余的插入到 anchor 前边
          patch(null, c2[i], el, anchor)
          i++
        }
      }
    } else if(i > e2){  // 删除元素
      while(i <= e1) {
        hostRemove(c1[i].el);
        i++;
      }
    } else { // 无规律情况 diff 算法，核心
      console.log('rrrr', i, e1, e2); // 2, 6, 5
      // ab cdeqf gh 
      // ab defc  gh
      const s1 = i;
      const s2 = i;
      const keyToNewIndexMap = new Map(); // 新的索引和key做成一个映射表  newNode.key: i
      for(let i = s2; i <= e2; i++){ // 遍历新节点数组剩余的节点
        const nextChild = c2[i];
        keyToNewIndexMap.set(nextChild.key, i);
      }

      const toBePatched = e2 - s2 + 1;  // 新节点中未对比的节点的长度
      const newIndexToOldMapIndex = new Array(toBePatched).fill(0); // 未对比的新节点长度的数组，存储对应位置在老节点数组中的位置(从1开始，是下标加1)

      for(let i = s1; i <= e1; i++){ // 遍历老节点中未对比的节点
        const prevChild = c1[i];
        let newIndex = keyToNewIndexMap.get(prevChild.key); // 老节点中当前元素的key在新节点数组中的索引
        if(newIndex == undefined) { // 老的有，新的没有，直接删除
          hostRemove(prevChild.el); 
        } else { // 新老都有的元素进行对比
          newIndexToOldMapIndex[newIndex - s2] = i + 1; // 未对比的新节点长度的数组赋值为对应节点在老节点数组中的位置(从1开始，是下标加1)
          patch(prevChild, c2[newIndex], el)
        }
      }
      console.log(newIndexToOldMapIndex)
      let increasingIndexSequence = getSequence(newIndexToOldMapIndex); // [0,1,2]

      console.log('change node ', increasingIndexSequence)

      let j = increasingIndexSequence.length - 1; // 最后一项的索引

      // 调换位置的， 核心就是根据最长递增子序列算法找出不需要重新创建和移动的元素
      for(let i = toBePatched - 1; i >= 0; i--){
        const nextIndex = s2 + i; // 未对比的新节点 defc 找到了 c 的index 5
        const nextChild = c2[nextIndex]; // 找到了新节点中的 c 
        let anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null; // 找到当前元素的下一个元素
        if(newIndexToOldMapIndex[i] == 0){ // 这是一个新元素，则直接插入到当前元素的下一个即可
          patch(null, nextChild, el, anchor)
        } else {
          // 根据参照物依次将节点直接移动过去， 所有节点都要移动，(但是有些节点是可以不动的)
          if(j < 0 || i != increasingIndexSequence[j]) { // 需要移动
            hostInsert(nextChild.el, el, anchor);
          } else {
            j--;
          }
        }
      }
    }

  }
  const patchChildren = (n1, n2, el) => {
    const c1 = n1.children; // 老的所有子节点
    const c2 = n2.children; // 新的所有子节点
    const prevShapeFlag = n1.shapeFlag; // 老的元素类型
    const shapeFlag = n2.shapeFlag; // 新的元素类型
    // 老的是文本  新的是文本  -> 新的覆盖老的即可
    // 老的是数组  新的是文本  -> 覆盖老的即可
    // 老的是文本  新的是数组  -> 移除老的文本 生成新的节点塞进去
    // 老的是数组  新的是数组  -> diff 算法
    if(shapeFlag & ShapeFlags.TEXT_CHILDREN){ // 新的是文本元素
      if(c2 !== c1) {  // 老的是文本  新的是文本
        hostSetElementText(el, c2)
      }
    } else { // 新的是数组
      if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 老的是数组
        console.log('diff 算法核心 核心呀')
        patchKeyChildren(c1, c2, el);
      } else {
        if(prevShapeFlag & ShapeFlags.TEXT_CHILDREN){ // 老的是文本
          // 移除老的文本
          hostSetElementText(el, '');
        }
        if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){ // 新的是数组
          // 把新的元素进行挂载在 生成新的节点塞进去
          for(let i = 0; i < c2.length; i++){
            patch(null, c2[i], el)
          }
        }
      }
    }
   
    
  }
  const patchElement = (n1, n2, container) => {
    // 如果 n1 和 n2 的类型一样，
    let el = (n2.el = n1.el); //
    const oldProps = n1.props || {};
    const newProps = n2.props || {};
    patchProps(oldProps, newProps, el); // 比对前后属性的元素差异
    patchChildren(n1, n2, el); // 比对前后元素的子节点
  }
  const mountComponent = (initialVnode, container) => {
    // 组件挂载逻辑   1.创建组件的实例  2.找到组件的render方法  3.执行render
    // 组件实例要记录当前组件的状态
    const instance = initialVnode.component = createComponentInstance(initialVnode)

    setupComponent(instance); // 找到组件的setup方法
    // 调用 render 方法，如果 render 方法中数据变化了，会重新渲染
    setupRenderEffect(instance, initialVnode, container); // 给组件创建一个 effect 用于渲染  == vue2 中的 watcher
  }

  const setupRenderEffect = (instance, initialVnode, container) => {
    effect(function componentEffect(){
      if(!instance.isMounted) {
        // 组件未挂载时，渲染组件中的内容
        const subTree = instance.subTree = instance.render(); // 组件对应渲染的结果，为后边做 diff 使用
        patch(null, subTree, container)
        instance.isMounted = true
      } else {
        // 组件更新逻辑
        let prev = instance.subTree; // 上一次的渲染结果
        let next = instance.render();
        console.log('更新patch入口', prev, next)
        patch(prev, next, container);
      }
    })
  }

  const updateComponent = (n1, n2, container) => {}

  const processElement = (n1, n2, container, anchor) => {
    if(n1 == null) {
      mountElement(n2, container, anchor); // 元素初始化
    } else {
      patchElement(n1, n2, container); // 元素更新
    }
  }
  const processComponent = (n1, n2, container) => {
    if(n1 == null) {
      mountComponent(n2, container); // 组件初始化
    } else {
      updateComponent(n1, n2, container) // 组件更新
    }
  }
   
  const isSameVnodeType = (n1, n2) => {
    return n1.type === n2.type && n1.key === n2.key
  }

  /**
   * 
   * @param n1 第一个元素
   * @param n2 第二个元素
   * @param container 容器
   * @param anchor 参照元素
   */
  const patch = (n1, n2, container, anchor=null)=>{
    let { shapeFlag } = n2;
    if(n1 && !isSameVnodeType(n1, n2)){
      // 有老节点，且节点类型不同， 老节点的虚拟节点上对应着真实节点
      hostRemove(n1.el); 
      n1 = null
    }
    // 直接渲染
    if(shapeFlag & ShapeFlags.ELEMENT) { // 与操作，都是1才是1
      // 是元素
      processElement(n1, n2, container, anchor);
    } else if(shapeFlag & ShapeFlags.STATEFUL_COMPONENT){
      // 是组件
      processComponent(n1, n2, container);
    }
  }

  return {
    createApp: createAppAPI(render)
  }
} 

function getSequence(arr:number[]): number[]{
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for(i = 0; i < len; i++){
    const arrI = arr[i];
    if(arrI !== 0){
      j = result[result.length - 1];
      if(arr[j] < arrI){
        p[i] = j;
        result.push(i);
        continue
      }
      u = 0;
      v = result.length - 1;
      while(u < v){
        c = ((u+v) / 2) | 0;
        if(arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if(arrI < arr[result[u]]) {
        if(u > 0){
          p[i] = result[u - 1]
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while( u-- > 0){
    result[u] = v;
    v = p[v];
  }
  return result
}