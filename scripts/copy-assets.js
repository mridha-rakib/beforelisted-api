const fs = require("fs");
const path = require("path");

const assets = [
  {
    source: path.join(
      __dirname,
      "..",
      "src",
      "services",
      "assets",
      "beforelisted-email-logo.png",
    ),
    target: path.join(
      __dirname,
      "..",
      "dist",
      "services",
      "assets",
      "beforelisted-email-logo.png",
    ),
  },
];

for (const asset of assets) {
  if (!fs.existsSync(asset.source)) {
    continue;
  }

  fs.mkdirSync(path.dirname(asset.target), { recursive: true });
  fs.copyFileSync(asset.source, asset.target);
}
