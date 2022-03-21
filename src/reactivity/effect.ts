import { isArray, isInteger } from '../shared/index';
export function effect(fn, options:any = {}){ // effect => vue2 watcher
  const effect = createReactiveEffect(fn, options)
  if(!options.lazy){
    effect();
  }
  return effect;
}

let activeEffect; // 全局变量，用来存储当前的 effect 函数
let uid = 0;
const effectStack = []; // effect 嵌套调用问题
function createReactiveEffect(fn, options) {
  const effect = function(){
    if(!effectStack.includes(effect)){ // 防止 effect 内修改使用的属性造成的递归问题
      try{
        activeEffect = effect;
        effectStack.push(activeEffect)
        return fn(); // 用户自己写的逻辑，内部会对数据进行取值操作，在取值时， 可以拿到这个 activeEffect
      } finally {
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1];
      }
    }
  }
  effect.id = uid++;
  effect.deps = []; // 用来表示 effect 中依赖了哪些属性
  return effect;
}

// 格式：哪个对象数据的哪个属性，在哪些个effect调用中使用了 {object: {key: [effect, effect, ...]}}
const targetMap = new WeakMap();  // {targe: {key: new Set()}}
// 将属性和effect做一个关联
export function track(target, key){
  if(activeEffect == undefined){
    return; // 没有在 effect 中调用获取属性
  }
  let depsMap = targetMap.get(target);
  if(!depsMap){
    targetMap.set(target, (depsMap=new Map()))
  }
  let dep = depsMap.get(key);
  if(!dep) {
    depsMap.set(key, (dep = new Set))
  }
  if(!dep.has(activeEffect)){
    dep.add(activeEffect);
    activeEffect.deps.push(dep); // 双向记忆的过程
  }
  // console.log(targetMap)
}


// set 属性时触发
export function trigger(target, type, key, value?, oldValue?){
  const depsMap = targetMap.get(target)
  if(!depsMap){
    return ;
  }
  const run = effects=>{
    if(effects) {
      effects.forEach(effect => {
        effect(); 
      });
    }
  }
  // 数组的处理
  if(key === 'length' && isArray(target)){
    depsMap.forEach((dep, key) => {
      if(key === 'length' || key >= value){ // 如果改的长度小于数组原有的长度时，应更新视图
        run(dep);
      }
    });
  } else {
    // 对象的处理
    if(key != void 0) { // 说明修改了 key
      run(depsMap.get(key));
    }
    switch(type){
      case 'add':
        if(isArray(target)){ // 给数组通过索引增加选项
          if(isInteger(key)){
            // 如果页面中直接使用了数组，也会对数组进行取值操作，会对 length 进行收集，新增属性时直接触发 length 即可
            run(depsMap.get('length'));
          }
        }
    }
  }

}