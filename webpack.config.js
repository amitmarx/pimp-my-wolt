const path = require("path");

module.exports = {
  mode: "none",
  entry: {
    micromodal: "/src/ext/micromodal.min.js",
    "group-manager": "/src/group-manager.js",
    "bi-logger": "/src/bi-logger.js",
    "pimp-my-wolt": "/src/pimp-my-wolt.js",
    "pimp-my-cibus": "/src/pimp-my-cibus.js",
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  //   watch: true,
};
