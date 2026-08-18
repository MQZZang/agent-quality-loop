给 clamp.js 加一个前置检查：如果 min > max，抛出 RangeError，消息用 `min must not exceed max`。其它行为保持不变。
