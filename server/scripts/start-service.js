var path = require("path");
var Service = require("node-windows").Service;

var scriptPath = path.resolve(__dirname, "../bin/index.js");

console.log("installing Cook service...");
console.log(scriptPath);

// Create a new service object
var svc = new Service({
  name: "SI DPO Cook",
  description: "Smithsonian DPO Cook - 3D Model/Geometry/Texture Processing Server",
  script: scriptPath,
  nodeOptions: []
});

svc.on("start", function() {
    console.log("service started.");
});

svc.on("install", function() {
    console.log("installation completed, starting service...");
    svc.start();
});

svc.install();