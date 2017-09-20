var gulp = require("gulp");
var sass = require("gulp-sass");
var cssMin = require("gulp-cssmin");
var sourceMaps = require("gulp-sourcemaps");

gulp.task("sass", function () {
    return gulp.src('assets/sass/app.scss')
        .pipe(sourceMaps.init())
        .pipe(sass({
            includePaths: ["./node_modules/bootstrap/scss"]
        }))
        .pipe(cssMin())
        .pipe(sourceMaps.write("../maps"))
        .pipe(gulp.dest('assets/css'));
});

gulp.task('fonts', function() {
    return gulp.src('./node_modules/bootstrap-sass/assets/fonts/**/*')
        .pipe(gulp.dest('assets/fonts'));
});

gulp.task("watch", function () {
    gulp.watch(["assets/sass/**/*.scss"], ["sass"]);
});

gulp.task('default', ["fonts", "sass"]);