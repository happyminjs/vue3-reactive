import { isFunction } from "../shared/index";

export function createComponentInstance(vnode) {
  const instance = {
    type: vnode.type,
    props: {},
    vnode,
    render: null,
    setupState: null,
    isMounted: false, // 默认组件未挂载
  }
  return instance
}

export function setupComponent(instance) {
  // 1.源码中会对属性进行初始化

  // 2.会对插槽进行初始化

  // 3.调用setup方法
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance){
  const Component = instance.type;  // 组件的虚拟节点
  const { setup } = Component
  if(setup) {
    const setupResult = setup();  // 获取setup返回的值
    // 判断返回值类型
    handleSetupRusult(instance, setupResult); // 
  }
}

function handleSetupRusult(instance, setupResult){
  if(isFunction(setupResult)) {
    instance.render = setupResult; // 获取 render 方法
  } else {
    instance.setupState = setupResult
  }
  finishComponentSetup(instance);
}

function finishComponentSetup(instance){
  const Component = instance.type;
  if(Component.render) {
    instance.render = Component.render; // 默认render优先级高于setup返回的render
  } else if(!instance.render) {
    // compile(Component.template) 编译成 render 函数
  }
  // vue3是兼容vue2的属性的  date component watch 等属性的

  // applyOptions() 是vue2和vue3中的 setup返回的结果做合并操作的函数方法
}