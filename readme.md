#### 本地服务搭建 vue3 + vueX + ts
npm install typescript rollup rollup-plugin-typescript2 @rollup/plugin-node-resolve
rollup: 打包
rollup-plugin-typescript2: rollup 解析 ts
@rollup/plugin-node-resolve： 解析第三方模块需要使用的
@rollup/plugin-replace: process.env 等变量替换
rollup-plugin-serve: 本地服务
#### 核心api
* **reactive** 返回对象的响应式副本，即为对象数据进行 proxy 代理
* **effect** 
* **ref**, 
* **computed**, 
* **toRefs**


