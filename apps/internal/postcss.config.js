const path = require("path");
const createAppPostcssConfig = require("../../postcss/createAppPostcssConfig.cjs");

module.exports = createAppPostcssConfig(path.join(__dirname));
