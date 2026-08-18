const { add } = require("./add");
if (add(2, 3) !== 5) {
  console.error("fail");
  process.exit(1);
}
console.log("ok");
