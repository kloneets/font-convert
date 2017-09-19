// let $ = require("jquery");

document.title += ' ' + process.env.npm_package_version;

let win = nw.Window.get();
let menu = new nw.Menu({type: "menubar"});
menu.append(new nw.MenuItem({
    label: "About",
    click: function () {
        alert("Developed by Janis Rublevskis\n\nAnd others!");
    }
}));

win.menu = menu;
