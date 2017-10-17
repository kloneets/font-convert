win.showDevTools();

console.log("Running in DEV mode");

var gulp = require("gulp");

gulp.task("reload", function () {
    if (location) {
        location.reload();
        console.log("reloaded app");
    }
});

gulp.task('css', function () {
    var styles = document.querySelectorAll('link[rel=stylesheet]');
    for (var i = 0; i < styles.length; i++) {
        // reload styles
        var restyled = styles[i].getAttribute('href') + '?v=' + Math.floor(Math.random() * 10000);
        styles[i].setAttribute('href', restyled);
    }
    console.log("Injected new css");
});

gulp.watch(["index.html", "./assets/js/app.js"], ["reload"]);
gulp.watch(['./assets/css/app.css'], ["css"]);