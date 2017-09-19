let gulp = require("gulp");
let sass = require("gulp-sass");
let babel = require("gulp-babel");
let cssMin = require("gulp-cssmin");
let sourceMaps = require("gulp-sourcemaps");

gulp.task("sass", function () {
    return gulp.src('assets/sass/app.scss')
        .pipe(sourceMaps.init())
        .pipe(sass({
            includePaths: ["./node_modules/bootstrap-sass/assets/stylesheets"]
        }))
        .pipe(cssMin())
        .pipe(sourceMaps.write("../maps"))
        .pipe(gulp.dest('assets/css'));
});

gulp.task("ES6", function () {
    return gulp.src('assets/js/dev/app.js')
        .pipe(sourceMaps.init())
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(sourceMaps.write("../maps"))
        .pipe(gulp.dest('assets/js'));
});

gulp.task('fonts', function() {
    return gulp.src('./node_modules/bootstrap-sass/assets/fonts/**/*')
        .pipe(gulp.dest('assets/fonts'));
});

gulp.task("watch", function () {

    gulp.watch(["assets/sass/**/*.scss"], ["sass"]);
    gulp.watch("assets/js/dev/app.js", ["ES6"]);
});

gulp.task('default', ["fonts", "ES6", "sass"]);