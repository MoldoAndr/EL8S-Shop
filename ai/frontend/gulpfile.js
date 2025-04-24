const gulp = require("gulp");
const fs = require("fs");
const path = require("path");

gulp.task("inline-assets", function (done) {
  const distPath = path.resolve("dist/frontend/browser");
  const indexPath = path.join(distPath, "index.html");

  if (!fs.existsSync(indexPath)) {
    console.error("Error: index.html not found at path:", indexPath);
    console.log("Directory contents:", fs.readdirSync(distPath));
    done(new Error("index.html not found"));
    return;
  }

  console.log("Reading index.html from:", indexPath);
  let indexContent = fs.readFileSync(indexPath, "utf8");

  // Inline CSS
  const cssRegex = /<link rel="stylesheet" href="([^"]+\.css)">/g;
  let match;
  let cssCount = 0;
  
  while ((match = cssRegex.exec(indexContent)) !== null) {
    const cssFile = match[1];
    const cssPath = path.join(distPath, cssFile);

    if (fs.existsSync(cssPath)) {
      console.log(`Inlining CSS: ${cssFile}`);
      const cssContent = fs.readFileSync(cssPath, "utf8");
      indexContent = indexContent.replace(
        match[0],
        `<style>${cssContent}</style>`,
      );
      cssCount++;
    } else {
      console.warn(`CSS file not found: ${cssPath}`);
    }
  }

  // Inline JS modules
  const jsModuleRegex = /<script src="([^"]+\.js)" type="module"><\/script>/g;
  let jsModuleCount = 0;
  
  while ((match = jsModuleRegex.exec(indexContent)) !== null) {
    const jsFile = match[1];
    const jsPath = path.join(distPath, jsFile);

    if (fs.existsSync(jsPath)) {
      console.log(`Inlining module JS: ${jsFile}`);
      const jsContent = fs.readFileSync(jsPath, "utf8");
      indexContent = indexContent.replace(
        match[0],
        `<script type="module">${jsContent}</script>`,
      );
      jsModuleCount++;
    } else {
      console.warn(`JS module file not found: ${jsPath}`);
    }
  }

  // Inline regular JS
  const jsRegex = /<script src="([^"]+\.js)"><\/script>/g;
  let jsCount = 0;
  
  while ((match = jsRegex.exec(indexContent)) !== null) {
    const jsFile = match[1];
    const jsPath = path.join(distPath, jsFile);

    if (fs.existsSync(jsPath)) {
      console.log(`Inlining regular JS: ${jsFile}`);
      const jsContent = fs.readFileSync(jsPath, "utf8");
      indexContent = indexContent.replace(
        match[0],
        `<script>${jsContent}</script>`,
      );
      jsCount++;
    } else {
      console.warn(`JS file not found: ${jsPath}`);
    }
  }

  // Write the modified content back to index.html
  fs.writeFileSync(indexPath, indexContent);
  
  console.log(`Inlining complete: ${cssCount} CSS files, ${jsModuleCount} JS modules, ${jsCount} regular JS files`);
  
  // Verify the inlining was successful
  const finalContent = fs.readFileSync(indexPath, "utf8");
  const hasInlinedStyles = finalContent.includes("<style>");
  const hasInlinedScripts = finalContent.includes("<script>");
  
  if (hasInlinedStyles && hasInlinedScripts) {
    console.log("✅ Verification successful: Found inlined styles and scripts");
  } else {
    console.warn("⚠️ Verification issue: Missing inlined content");
    if (!hasInlinedStyles) console.warn("  - No <style> tags found");
    if (!hasInlinedScripts) console.warn("  - No <script> tags found");
  }
  
  done();
});

// Default task runs inline-assets
gulp.task("default", gulp.series("inline-assets"));