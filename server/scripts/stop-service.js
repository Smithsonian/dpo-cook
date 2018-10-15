var path = require("path");
var Service = require("node-windows").Service;

var scriptPath = path.resolve(__dirname, "../bin/index.js");

console.log("uninstalling Cook service...");
console.log(scriptPath);

// Create a new service object
var svc = new Service({
    name: "SI DPO Cook",
    script: scriptPath
});

svc.on("stop", function() {
    console.log("service stopped.");
    svc.uninstall();
});

// Listen for the "uninstall" event so we know when it's done.
svc.on("uninstall",function() {
  console.log("uninstall complete, service exists = " + svc.exists);
});

// Uninstall the service.
svc.stop();