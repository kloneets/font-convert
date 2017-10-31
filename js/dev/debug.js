nw.Window.get().showDevTools();

console.log("Running in DEV mode");

let gulp = require("gulp");

gulp.task("reload", function () {
    if (location) {
        location.reload();
        console.log("reloaded app");
    }
});

gulp.task('css', function () {
    let styles = document.querySelectorAll('link[rel=stylesheet]');
    for (let i = 0; i < styles.length; i++) {
        // reload styles
        let restyled = styles[i].getAttribute('href') + '?v=' + Math.floor(Math.random() * 10000);
        styles[i].setAttribute('href', restyled);
    }
    console.log("Injected new css");
});

gulp.watch(["index.html", path.resolve(process.cwd(), path.join('js', "/app.js"))], ["reload"]);
gulp.watch([path.resolve(process.cwd(), path.join('assets', 'css', 'app.css'))], ["css"]);