import Module from 'manifold-3d';

async function test() {
  const manifold = await Module();
  manifold.setup();
  console.log("Keys in manifold:", Object.keys(manifold));
  
  // Test a simple boolean
  const cube = manifold.cube([1, 1, 1], true);
  const sphere = manifold.sphere(0.6, 32);
  const result = manifold.difference(cube, sphere);
  
  const mesh = result.getMesh();
  console.log("Result mesh vertices:", mesh.vertProperties.length / 3);
}

test().catch(console.error);
