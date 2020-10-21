var gulp = require("gulp")
var ts = require("gulp-typescript")
var tsProject = ts.createProject("tsconfig.json")
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var buffer = require('vinyl-buffer');

function copyJson() {
  return gulp.src('src/**/*.json').pipe(gulp.dest("dist"))
}

copyJson()

gulp.task("default", function () {
  return tsProject.src()
    .pipe(tsProject())
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest("dist"))
})