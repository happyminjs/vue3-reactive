import { isSymbol, isObject, isArray, isInteger, hasOwn, hasChanged } from '../shared/index';
import { track, trigger } from './effect';
import { reactive } from './reactive';

function createGetter(){ // 获取对象中的属性会执行此方法
  return function get(target, key, receiver){
    const res = Reflect.get(target, key, receiver); // ES6语法，等价于 target[key]
    // 如果取的值是 symbol 类型， 要忽略它
    if(isSymbol(key)){ // 数组中有很多 symbol 的内置方法
      return res;
    }
    // 依赖收集
    track(target, key);
    console.log('获取数据操作', key);
    if(isObject(res)){ // 取值的时候是对象的话，再进行代理， 懒递归，；；； Vue2 中是初始化的时候就所有数据都进行了重新get和set
      return reactive(res)
    }
    return res;
  }
}
function createSetter(){ // 修改属性值时，会执行此方法
  return function set(target, key, value, receiver){
    
    // vue2中不支持新增属性
    // 判断是新增属性还是修改属性
    const oldVal = target[key]; // 如果是修改，则 oldVal 有值
    // 判断有没有这个属性: 第一种 数组新增的逻辑    第二种是对象的逻辑
    const hasKey = (isArray(target) && isInteger(key)) ? Number(key) < target.length : hasOwn(target, key);
    const result = Reflect.set(target, key, value, receiver); // ES6语法，等价于 target[key] = value
    if(!hasKey){
      console.log('新增属性');
      trigger(target, 'add', key, value)
    } else if(hasChanged(value, oldVal)){
      console.log('修改属性');
      trigger(target, 'set', key, value, oldVal)
    }
    
    return result;
  }
}
const get = createGetter(); // 为了预置参数，采用此种方式写法
const set = createSetter();

export const mutableHandlers = {
  get,
  set
}
