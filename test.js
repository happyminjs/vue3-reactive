// 最长递增子序列
function getSequence(arr){
  const p = arr.slice(); // 拷贝一个一样的数组，用来存储 result 中未变更
  const result = [0]; // 默认以下标 0 作为开头，值存储的是 arr 数组对应项的下标
  let i, j, u, v, c; // i 用作 arr 循环；  j 是 result 的最后一项;  u和v做result二分查找时前后指针
  const len = arr.length;
  for(i = 0; i < len; i++){
    const arrI = arr[i];
    if(arrI !== 0){
      // arrI 与 result 的最后一项对比
      j = result[result.length - 1]; 
      if(arr[j] < arrI){ // 
        p[i] = j; // 将当前最后一项 放到 p 数组 对应的索引上
        result.push(i);
        continue
      }
      // arrI 与 result 每项对比，找到比它大最小的进行替换
      // 对result用二分查找方法
      u = 0;
      v = result.length - 1;
      while(u < v){ // u 和 v 相等则停止
        c = ((u+v) / 2) | 0; // c:二分查找当前的下标位置
        if(arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      // u==v 对result数组中存储的下标进行相应的替换
      if(arrI < arr[result[u]]) {
        if(u > 0){
          p[i] = result[u - 1]
        }
        result[u] = i; 
      }
    }
  }
  console.log('ppp', p)  // [ 2, 0, 0, 2, 3, 2 ]， 存储的每一次循环时 result 的最后一项
  console.log('result rr', result)  // [ 0, 2, 5, 4 ]
  u = result.length;  // 4
  v = result[u - 1]; // result 最后一项 4
  while( u-- > 0){
    result[u] = v;
    v = p[v];
  }
  return result
}

// 最长递增的长度怎么求
// console.log(getSequence([4, 5, 7, 3]))
console.log(getSequence([2,5,4,8,11,6]))  /// [ 0, 2, 3, 4 ]
// [2,5,4,8,11,6]  原数组
// [0,1,2,3,4 ,5]  下标
// [2,0,0,2,3 ,2]  p数组
// [ 0, 2, 3, 4 ]  结果
// 2        0
// 2 5      0 1
// 2 4      0 2 
// 2 4 8    0 2 3
// 2 4 8 11 0 2 3 4
// 2 4 6 11 0 2 5 4  ---->  长度为 4
// console.log(getSequence([4, 5, 3, 0]))