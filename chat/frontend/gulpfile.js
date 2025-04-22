const gulp = require("gulp");
const fs = require("fs");
const path = require("path");

gulp.task("inline-assets", function (done) {
  const distPath = path.resolve("dist/frontend/browser");
  const indexPath = path.join(distPath, "index.html");

  let indexContent = fs.readFileSync(indexPath, "utf8");

  const cssRegex = /<link rel="stylesheet" href="([^"]+\.css)">/g;
  let match;
  while ((match = cssRegex.exec(indexContent)) !== null) {
    const cssFile = match[1];
    const cssPath = path.join(distPath, cssFile);

    if (fs.existsSync(cssPath)) {
      const cssContent = fs.readFileSync(cssPath, "utf8");
      indexContent = indexContent.replace(
        match[0],
        `<style>${cssContent}</style>`,
      );
    }
  }

  let jsRegex = /<script src="([^"]+\.js)" type="module"><\/script>/g;
  while ((match = jsRegex.exec(indexContent)) !== null) {
    const jsFile = match[1];
    const jsPath = path.join(distPath, jsFile);

    if (fs.existsSync(jsPath)) {
      const jsContent = fs.readFileSync(jsPath, "utf8");
      indexContent = indexContent.replace(
        match[0],
        `<script type="module">${jsContent}</script>`,
      );
    }
  }

  jsRegex = /<script src="([^"]+\.js)"><\/script>/g;
  while ((match = jsRegex.exec(indexContent)) !== null) {
    const jsFile = match[1];
    const jsPath = path.join(distPath, jsFile);

    if (fs.existsSync(jsPath)) {
      const jsContent = fs.readFileSync(jsPath, "utf8");
      indexContent = indexContent.replace(
        match[0],
        `<script>${jsContent}</script>`,
      );
    }
  }
  fs.writeFileSync(indexPath, indexContent);
  console.log("Assets inlined successfully!");
  done();
});

gulp.task("default", gulp.series("inline-assets"));
