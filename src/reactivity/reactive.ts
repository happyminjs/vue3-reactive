import { isObject } from '../shared/index';
import { mutableHandlers } from './baseHandlers';

export function reactive(target:object){
  // 将target变成响应式对象 proxy
  return createReactiveObject(target, mutableHandlers); // 核心操作就是当读取数据时，做依赖收集；当数据变化时，重新执行effect方法
}

const proxyMap = new WeakMap(); // 存储映射表，防止多次代理
function createReactiveObject(target, baseHandlers){
  if(!isObject(target)){
    // 如果不是对象，直接返回
    return target;
  }
  const exisitingProxy = proxyMap.get(target);
  if(exisitingProxy){
    return exisitingProxy;
  }
  const proxy = new Proxy(target, baseHandlers); // 只是给对象最外层做代理，默认不递归，而且不会重新重写对象中的属性
  proxyMap.set(target, proxy); // 将代理的对象和代理后的结果做一个映射表，防止多次代理同一个对象
  return proxy;
}
  