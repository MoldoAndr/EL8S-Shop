const gulp = require('gulp');
const inline = require('gulp-inline-source');

gulp.task('inline-assets', () => {
  return gulp.src('dist/frontend/browser/index.html')
    .pipe(inline({
      rootpath: 'dist/frontend/browser'
    }))
    .pipe(gulp.dest('dist/frontend/browser'));
});

gulp.task('default', gulp.series('inline-assets'));