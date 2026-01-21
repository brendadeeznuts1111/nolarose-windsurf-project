// Memory usage test script
const used = process.memoryUsage();
const data = new Array(100000).fill(0).map((_, i) => ({
	id: i,
	value: Math.random(),
	nested: { deep: { value: `item_${i}` } },
}));

console.log("Memory Usage:");
for (const key in used) {
	console.log(
		`${key}: ${Math.round((used[key] / 1024 / 1024) * 100) / 100} MB`,
	);
}

console.log("Array created with 100,000 items");
console.log("Processing complete!");

if (global.gc) {
	global.gc();
	console.log("Garbage collection triggered");
}
