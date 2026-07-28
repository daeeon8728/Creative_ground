const manifoldModule = require('manifold-3d');
console.log(manifoldModule);
async function test() {
  const Module = await manifoldModule();
  Module.setup();
  console.log("Keys in Module:", Object.keys(Module));
}
test().catch(console.error);
