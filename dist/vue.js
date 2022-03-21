(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Vue = {}));
})(this, (function (exports) { 'use strict';

  function toRefs() {
  }

  const isObject = (val) => typeof val == 'object' && val != null;
  const isSymbol = (val) => typeof val == 'symbol';
  const isArray = Array.isArray;
  const isInteger = (key) => ('' + parseInt(key, 10)) === key; // 是否是数字字符串
  const hasOwnProperty = Object.prototype.hasOwnProperty;
  const hasOwn = (val, key) => hasOwnProperty.call(val, key);
  const hasChanged = (value, oldValue) => value !== oldValue;
  const isString = (value) => typeof value === 'string';
  const isFunction = (value) => typeof value === 'function';

  function effect(fn, options = {}) {
      const effect = createReactiveEffect(fn);
      if (!options.lazy) {
          effect();
      }
      return effect;
  }
  let activeEffect; // 全局变量，用来存储当前的 effect 函数
  let uid = 0;
  const effectStack = []; // effect 嵌套调用问题
  function createReactiveEffect(fn, options) {
      const effect = function () {
          if (!effectStack.includes(effect)) { // 防止 effect 内修改使用的属性造成的递归问题
              try {
                  activeEffect = effect;
                  effectStack.push(activeEffect);
                  return fn(); // 用户自己写的逻辑，内部会对数据进行取值操作，在取值时， 可以拿到这个 activeEffect
              }
              finally {
                  effectStack.pop();
                  activeEffect = effectStack[effectStack.length - 1];
              }
          }
      };
      effect.id = uid++;
      effect.deps = []; // 用来表示 effect 中依赖了哪些属性
      return effect;
  }
  // 格式：哪个对象数据的哪个属性，在哪些个effect调用中使用了 {object: {key: [effect, effect, ...]}}
  const targetMap = new WeakMap(); // {targe: {key: new Set()}}
  // 将属性和effect做一个关联
  function track(target, key) {
      if (activeEffect == undefined) {
          return; // 没有在 effect 中调用获取属性
      }
      let depsMap = targetMap.get(target);
      if (!depsMap) {
          targetMap.set(target, (depsMap = new Map()));
      }
      let dep = depsMap.get(key);
      if (!dep) {
          depsMap.set(key, (dep = new Set));
      }
      if (!dep.has(activeEffect)) {
          dep.add(activeEffect);
          activeEffect.deps.push(dep); // 双向记忆的过程
      }
      // console.log(targetMap)
  }
  // set 属性时触发
  function trigger(target, type, key, value, oldValue) {
      const depsMap = targetMap.get(target);
      if (!depsMap) {
          return;
      }
      const run = effects => {
          if (effects) {
              effects.forEach(effect => {
                  effect();
              });
          }
      };
      // 数组的处理
      if (key === 'length' && isArray(target)) {
          depsMap.forEach((dep, key) => {
              if (key === 'length' || key >= value) { // 如果改的长度小于数组原有的长度时，应更新视图
                  run(dep);
              }
          });
      }
      else {
          // 对象的处理
          if (key != void 0) { // 说明修改了 key
              run(depsMap.get(key));
          }
          switch (type) {
              case 'add':
                  if (isArray(target)) { // 给数组通过索引增加选项
                      if (isInteger(key)) {
                          // 如果页面中直接使用了数组，也会对数组进行取值操作，会对 length 进行收集，新增属性时直接触发 length 即可
                          run(depsMap.get('length'));
                      }
                  }
          }
      }
  }

  function createGetter() {
      return function get(target, key, receiver) {
          const res = Reflect.get(target, key, receiver); // ES6语法，等价于 target[key]
          // 如果取的值是 symbol 类型， 要忽略它
          if (isSymbol(key)) { // 数组中有很多 symbol 的内置方法
              return res;
          }
          // 依赖收集
          track(target, key);
          console.log('获取数据操作', key);
          if (isObject(res)) { // 取值的时候是对象的话，再进行代理， 懒递归，；；； Vue2 中是初始化的时候就所有数据都进行了重新get和set
              return reactive(res);
          }
          return res;
      };
  }
  function createSetter() {
      return function set(target, key, value, receiver) {
          // vue2中不支持新增属性
          // 判断是新增属性还是修改属性
          const oldVal = target[key]; // 如果是修改，则 oldVal 有值
          // 判断有没有这个属性: 第一种 数组新增的逻辑    第二种是对象的逻辑
          const hasKey = (isArray(target) && isInteger(key)) ? Number(key) < target.length : hasOwn(target, key);
          const result = Reflect.set(target, key, value, receiver); // ES6语法，等价于 target[key] = value
          if (!hasKey) {
              console.log('新增属性');
              trigger(target, 'add', key, value);
          }
          else if (hasChanged(value, oldVal)) {
              console.log('修改属性');
              trigger(target, 'set', key, value);
          }
          return result;
      };
  }
  const get = createGetter(); // 为了预置参数，采用此种方式写法
  const set = createSetter();
  const mutableHandlers = {
      get,
      set
  };

  function reactive(target) {
      // 将target变成响应式对象 proxy
      return createReactiveObject(target, mutableHandlers); // 核心操作就是当读取数据时，做依赖收集；当数据变化时，重新执行effect方法
  }
  const proxyMap = new WeakMap(); // 存储映射表，防止多次代理
  function createReactiveObject(target, baseHandlers) {
      if (!isObject(target)) {
          // 如果不是对象，直接返回
          return target;
      }
      const exisitingProxy = proxyMap.get(target);
      if (exisitingProxy) {
          return exisitingProxy;
      }
      const proxy = new Proxy(target, baseHandlers); // 只是给对象最外层做代理，默认不递归，而且不会重新重写对象中的属性
      proxyMap.set(target, proxy); // 将代理的对象和代理后的结果做一个映射表，防止多次代理同一个对象
      return proxy;
  }

  function ref() {
  }

  function computed() {
  }

  function patchClass(el, value) {
      if (value == null) {
          value = '';
      }
      el.className = value;
  }
  function patchStyle(el, prev, next) {
      const style = el.style;
      if (!next) {
          el.removeAttribute('style'); // 不需要样式
      }
      else {
          for (let key in next) {
              style[key] = next[key];
          }
          if (prev) {
              for (let key in prev) {
                  if (next[key] == null) {
                      style[key] = '';
                  }
              }
          }
      }
  }
  function patchAttr(el, key, value) {
      if (value == null) {
          el.removeAttribute(key);
      }
      else {
          el.setAttribute(key, value);
      }
  }
  function patchProp(el, key, preValue, nextValue) {
      switch (key) {
          case 'class':
              patchClass(el, nextValue);
              break;
          case 'style':
              patchStyle(el, preValue, nextValue);
              break;
          default:
              patchAttr(el, key, nextValue);
              break;
      }
  }

  const nodeOps = {
      createElement(type) {
          return document.createElement(type);
      },
      patchProp(el, key, pre, next) {
          patchProp(el, key, pre, next);
      },
      setElementText(el, text) {
          el.textContent = text;
      },
      insert(child, parent, anchor = null) {
          parent.insertBefore(child, anchor);
          // 将 child 插入到 anchor 的前边，
          // anchor 为空时，等价于 parent.appendChild(child)
      },
      remove(child) {
          const parent = child.parentNode;
          if (parent) {
              parent.removeChild(child);
          }
      }
  };

  function createVnode(type, props = {}, children = null) {
      // type 是什么类型：  对象或者字符串，即组件或者tag
      const shapeFlag = isString(type) ? 1 /* ELEMENT */ : (isObject(type) ? 4 /* STATEFUL_COMPONENT */ : 0);
      const vnode = {
          type,
          props,
          children,
          component: null,
          el: null,
          key: props.key,
          shapeFlag, // vue3中一个非常优秀的做法，  虚拟节点的类型  元素、组件、
      };
      if (isArray(children)) {
          // 1
          vnode.shapeFlag |= 16 /* ARRAY_CHILDREN */; // 如果在或的过程中有一个是1就是1， 把良哥数相加
      }
      else {
          vnode.shapeFlag |= 8 /* TEXT_CHILDREN */;
      }
      return vnode;
  }

  function createAppAPI(render) {
      return (rootComponent) => {
          const app = {
              mount(container) {
                  // 用户调用的 mount 方法
                  const vnode = createVnode(rootComponent);
                  render(vnode, container); // 核心逻辑是调用 render
              }
          };
          return app;
      };
  }

  function createComponentInstance(vnode) {
      const instance = {
          type: vnode.type,
          props: {},
          vnode,
          render: null,
          setupState: null,
          isMounted: false, // 默认组件未挂载
      };
      return instance;
  }
  function setupComponent(instance) {
      // 1.源码中会对属性进行初始化
      // 2.会对插槽进行初始化
      // 3.调用setup方法
      setupStatefulComponent(instance);
  }
  function setupStatefulComponent(instance) {
      const Component = instance.type; // 组件的虚拟节点
      const { setup } = Component;
      if (setup) {
          const setupResult = setup(); // 获取setup返回的值
          // 判断返回值类型
          handleSetupRusult(instance, setupResult); // 
      }
  }
  function handleSetupRusult(instance, setupResult) {
      if (isFunction(setupResult)) {
          instance.render = setupResult; // 获取 render 方法
      }
      else {
          instance.setupState = setupResult;
      }
      finishComponentSetup(instance);
  }
  function finishComponentSetup(instance) {
      const Component = instance.type;
      if (Component.render) {
          instance.render = Component.render; // 默认render优先级高于setup返回的render
      }
      else if (!instance.render) ;
      // vue3是兼容vue2的属性的  date component watch 等属性的
      // applyOptions() 是vue2和vue3中的 setup返回的结果做合并操作的函数方法
  }

  function createRenderer(options) {
      return baseCreateRenderer(options);
  }
  function baseCreateRenderer(options) {
      const { createElement: hostCreateElement, patchProp: hostPatchProp, setElementText: hostSetElementText, insert: hostInsert, remove: hostRemove } = options;
      const render = (vnode, container) => {
          // 需要将虚拟节点变成真实节点，挂载到容器上
          patch(null, vnode, container);
      };
      const mountElement = (vnode, container, anchor) => {
          let { shapeFlag, props } = vnode;
          let el = vnode.el = hostCreateElement(vnode.type);
          // 创建儿子节点
          if (shapeFlag & 8 /* TEXT_CHILDREN */) {
              hostSetElementText(el, vnode.children);
          }
          else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
              mountChildren(vnode.children, el);
          }
          if (props) { // 属性
              for (let key in props) {
                  hostPatchProp(el, key, null, props[key]);
              }
          }
          hostInsert(el, container, anchor);
      };
      const mountChildren = (children, container) => {
          for (let i = 0; i < children.length; i++) {
              patch(null, children[i], container);
          }
      };
      const patchProps = (oldProps, newProps, el) => {
          if (oldProps !== newProps) {
              // 新的需要覆盖老的属性
              for (let key in newProps) {
                  const prev = oldProps[key];
                  const next = newProps[key];
                  if (prev != next) {
                      hostPatchProp(el, key, prev, next);
                  }
              }
              // 老的有的属性，新的没有， 将老的属性删除
              for (const key in oldProps) {
                  if (!(key in newProps)) {
                      hostPatchProp(el, key, oldProps[key], null);
                  }
              }
          }
      };
      const patchKeyChildren = (c1, c2, el) => {
          // 内部优化策略
          // abc  i = 0
          // abde 
          let i = 0;
          let e1 = c1.length - 1; // 老儿子节点中最后一项的索引  2
          let e2 = c2.length - 1; // 新儿子节点中最后一项的索引  3
          // 1、先特殊情况：从头比较    处理最后增删的节点
          while (i <= e1 && i <= e2) { // 任意子节点循环完，则循环比对结束
              const n1 = c1[i];
              const n2 = c2[i];
              if (isSameVnodeType(n1, n2)) {
                  patch(n1, n2, el); // 递归比对子元素
              }
              else {
                  break;
              }
              i++;
          }
          console.log('aaaaaaaaa', i, e1, e2);
          // 2、先特殊情况：从后往前比   处理开始增删的节点
          while (i <= e1 && i <= e2) {
              const n1 = c1[e1];
              const n2 = c2[e2];
              if (isSameVnodeType(n1, n2)) {
                  patch(n1, n2, el);
              }
              else {
                  break;
              }
              e1--;
              e2--;
          }
          console.log('rrr111', 0, 0, -1);
          // 3、特殊情况：只考虑元素在头或者尾，新增和删除的情况
          // abc -> abcd  i=3,e1=2,e2=3
          // abc -> dabc  i=0,e1=-1,e2=0
          // abcd -> abc  i=3,e1=3,e2=2
          if (i > e1) { // 只要 i 大于了 e1 表示是新增属性
              if (i <= e2) { // 表示有新增部分
                  // 先根据 e2 取他的下一个元素 和 数组长度进行比较
                  const nextPos = e2 + 1;
                  // 如果有下一个，则说明是往前插入
                  const anchor = nextPos < c2.length ? c2[nextPos].el : null;
                  while (i <= e2) { // 将 c2 中剩余的插入到 anchor 前边
                      patch(null, c2[i], el, anchor);
                      i++;
                  }
              }
          }
          else if (i > e2) { // 删除元素
              while (i <= e1) {
                  hostRemove(c1[i].el);
                  i++;
              }
          }
          else { // 无规律情况 diff 算法，核心
              console.log('rrrr', i, e1, e2); // 2, 6, 5
              // ab cdeq fgh 
              // ab defc gh
              const s1 = i;
              const s2 = i;
              const keyToNewIndexMap = new Map(); // 新的索引和key做成一个映射表
              for (let i = s2; i <= e2; i++) { // 遍历新节点数组剩余的节点
                  const nextChild = c2[i];
                  keyToNewIndexMap.set(nextChild.key, i);
              }
              const toBePatched = e2 - s2 + 1;
              const newIndexToOldMapIndex = new Array(toBePatched).fill(0);
              for (let i = s1; i <= e1; i++) {
                  const prevChild = c1[i];
                  let newIndex = keyToNewIndexMap.get(prevChild.key); // 获取新的索引
                  if (newIndex == undefined) {
                      hostRemove(prevChild.el); // 老的有，新的没有，直接删除
                  }
                  else {
                      newIndexToOldMapIndex[newIndex - s2] = i + 1;
                      patch(prevChild, c2[newIndex], el);
                  }
              }
              console.log(newIndexToOldMapIndex);
              let increasingIndexSequence = getSequence(newIndexToOldMapIndex); // [0,1]
              console.log('change node ', increasingIndexSequence);
              let j = increasingIndexSequence.length - 1; // 最后一项的索引
              // 调换位置的， 核心就是根据最长递增子序列算法找出不需要重新创建，只需要移动位置的元素
              for (let i = toBePatched - 1; i >= 0; i--) {
                  const nextIndex = s2 + i; // edch 找到了 h 
                  const nextChild = c2[nextIndex]; // 找到 h 的索引
                  let anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null; // 找到当前元素的下一个元素
                  if (newIndexToOldMapIndex[i] == 0) { // 这是一个新元素，则直接插入到当前元素的下一个即可
                      patch(null, nextChild, el, anchor);
                  }
                  else {
                      // 根据参照物依次将节点直接移动过去， 所有节点都要移动，(但是有些节点是可以不动的)
                      if (j < 0 || i != increasingIndexSequence[j]) { // 需要移动
                          hostInsert(nextChild.el, el, anchor);
                      }
                      else {
                          j--;
                      }
                  }
              }
          }
      };
      const patchChildren = (n1, n2, el) => {
          const c1 = n1.children; // 老的所有子节点
          const c2 = n2.children; // 新的所有子节点
          const prevShapeFlag = n1.shapeFlag; // 老的元素类型
          const shapeFlag = n2.shapeFlag; // 新的元素类型
          // 老的是文本  新的是文本  -> 新的覆盖老的即可
          // 老的是数组  新的是文本  -> 覆盖老的即可
          // 老的是文本  新的是数组  -> 移除老的文本 生成新的节点塞进去
          // 老的是数组  新的是数组  -> diff 算法
          if (shapeFlag & 8 /* TEXT_CHILDREN */) { // 新的是文本元素
              if (c2 !== c1) { // 老的是文本  新的是文本
                  hostSetElementText(el, c2);
              }
          }
          else { // 新的是数组
              if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) { // 老的是数组
                  console.log('diff 算法核心 核心呀');
                  patchKeyChildren(c1, c2, el);
              }
              else {
                  if (prevShapeFlag & 8 /* TEXT_CHILDREN */) { // 老的是文本
                      // 移除老的文本
                      hostSetElementText(el, '');
                  }
                  if (shapeFlag & 16 /* ARRAY_CHILDREN */) { // 新的是数组
                      // 把新的元素进行挂载在 生成新的节点塞进去
                      for (let i = 0; i < c2.length; i++) {
                          patch(null, c2[i], el);
                      }
                  }
              }
          }
      };
      const patchElement = (n1, n2, container) => {
          // 如果 n1 和 n2 的类型一样，
          let el = (n2.el = n1.el); //
          const oldProps = n1.props || {};
          const newProps = n2.props || {};
          patchProps(oldProps, newProps, el); // 比对前后属性的元素差异
          patchChildren(n1, n2, el); // 比对前后元素的子节点
      };
      const mountComponent = (initialVnode, container) => {
          // 组件挂载逻辑   1.创建组件的实例  2.找到组件的render方法  3.执行render
          // 组件实例要记录当前组件的状态
          const instance = initialVnode.component = createComponentInstance(initialVnode);
          setupComponent(instance); // 找到组件的setup方法
          // 调用 render 方法，如果 render 方法中数据变化了，会重新渲染
          setupRenderEffect(instance, initialVnode, container); // 给组件创建一个 effect 用于渲染  == vue2 中的 watcher
      };
      const setupRenderEffect = (instance, initialVnode, container) => {
          effect(function componentEffect() {
              if (!instance.isMounted) {
                  // 组件未挂载时，渲染组件中的内容
                  const subTree = instance.subTree = instance.render(); // 组件对应渲染的结果，为后边做 diff 使用
                  patch(null, subTree, container);
                  instance.isMounted = true;
              }
              else {
                  // 组件更新逻辑
                  let prev = instance.subTree; // 上一次的渲染结果
                  let next = instance.render();
                  console.log('更新patch入口', prev, next);
                  patch(prev, next, container);
              }
          });
      };
      const processElement = (n1, n2, container, anchor) => {
          if (n1 == null) {
              mountElement(n2, container, anchor); // 元素初始化
          }
          else {
              patchElement(n1, n2); // 元素更新
          }
      };
      const processComponent = (n1, n2, container) => {
          if (n1 == null) {
              mountComponent(n2, container); // 组件初始化
          }
      };
      const isSameVnodeType = (n1, n2) => {
          return n1.type === n2.type && n1.key === n2.key;
      };
      /**
       *
       * @param n1 第一个元素
       * @param n2 第二个元素
       * @param container 容器
       * @param anchor 参照元素
       */
      const patch = (n1, n2, container, anchor = null) => {
          let { shapeFlag } = n2;
          if (n1 && !isSameVnodeType(n1, n2)) {
              // 有老节点，且节点类型不同， 老节点的虚拟节点上对应着真实节点
              hostRemove(n1.el);
              n1 = null;
          }
          // 直接渲染
          if (shapeFlag & 1 /* ELEMENT */) { // 与操作，都是1才是1
              // 是元素
              processElement(n1, n2, container, anchor);
          }
          else if (shapeFlag & 4 /* STATEFUL_COMPONENT */) {
              // 是组件
              processComponent(n1, n2, container);
          }
      };
      return {
          createApp: createAppAPI(render)
      };
  }
  function getSequence(arr) {
      const p = arr.slice();
      const result = [0];
      let i, j, u, v, c;
      const len = arr.length;
      for (i = 0; i < len; i++) {
          const arrI = arr[i];
          if (arrI !== 0) {
              j = result[result.length - 1];
              if (arr[j] < arrI) {
                  p[i] = j;
                  result.push(i);
                  continue;
              }
              u = 0;
              v = result.length - 1;
              while (u < v) {
                  c = ((u + v) / 2) | 0;
                  if (arr[result[c]] < arrI) {
                      u = c + 1;
                  }
                  else {
                      v = c;
                  }
              }
              if (arrI < arr[result[u]]) {
                  if (u > 0) {
                      p[i] = result[u - 1];
                  }
                  result[u] = i;
              }
          }
      }
      u = result.length;
      v = result[u - 1];
      while (u-- > 0) {
          result[u] = v;
          v = p[v];
      }
      return result;
  }

  function h(type, props = {}, children = null) {
      return createVnode(type, props, children);
  }

  const renderOptions = Object.assign({}, nodeOps);
  function ensureRenderer() {
      return createRenderer(renderOptions);
  }
  // createApp(App).mount('#app')
  function createApp(rootComponent) {
      console.log(rootComponent);
      // 1. 根据组件 创建一个渲染器
      // app 是对外暴露的
      const app = ensureRenderer().createApp(rootComponent);
      const { mount } = app;
      app.mount = function (container) {
          // 1. 挂载时需要先将容器清空，再进行挂载
          container = document.querySelector(container);
          container.innerHTML = '';
          mount(container);
      };
      // 2.
      return app;
  }

  exports.computed = computed;
  exports.createApp = createApp;
  exports.createRenderer = createRenderer;
  exports.effect = effect;
  exports.h = h;
  exports.reactive = reactive;
  exports.ref = ref;
  exports.toRefs = toRefs;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=vue.js.map
