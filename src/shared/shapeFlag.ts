

export const enum ShapeFlags {
  ELEMENT = 1, // 1
  FUNCTIONAL_COMPONENT = 1 << 1,  // 2 1左移一位，即2， 左移两位是4，即 1*2²
  STATEFUL_COMPONENT = 1 << 2, // 4
  TEXT_CHILDREN = 1 << 3, // 8
  ARRAY_CHILDREN = 1 << 4, // 16
}