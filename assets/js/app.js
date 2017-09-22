"use strict";

var $ = require("jquery");
var path = require("path");

document.title += ' ' + process.env.npm_package_version;

var win = nw.Window.get();

var app = {
    allowedFontTypes: ["ttf", "otf"],
    fontFiles: [],
    weightOptions: {
        "100": "Thin",
        "300": "Light",
        "400": "Regular",
        "500": "Medium",
        "700": "Bold",
        "900": "Black"
    },

    styleOptions: {
        "normal": "Normal",
        "italic": "Italic"
    },

    init: function () {
        this.buildMenu();
        this.fileChooser();
    },

    fileChooser: function () {
        var scope = this;
        $(document).on('click', '#chose-fonts', function (event) {
            event.preventDefault();

            var chooser = document.querySelector("#fonts");
            chooser.addEventListener("change", function(evt) {
                scope.parseFonts(this.value);
                console.log(scope.fontFiles);
                scope.rebuildList();
            }, false);

            chooser.click();
        });
    },

    /**
     *
     * @param fonts
     * @returns {*}
     */
    parseFonts: function(fonts) {
        if(fonts) {
            fonts = fonts.split(';');
            for(var i = 0; i < fonts.length; i++) {
                var ext = fonts[i].split('.').pop().toLowerCase();
                if(this.allowedFontTypes.indexOf(ext) !== -1) {
                    this.fontFiles.push(fonts[i]);
                }
            }
        }
    },

    rebuildList:function () {
        // todo: parse current list and save options
        var currentList = [];

        var rows = document.getElementById("font-table");
        rows = $("tbody", rows);

        for(var i = 0; i < this.fontFiles['length']; i++) {
            var font = path.normalize(this.fontFiles[i]);
            var fontName = font.split('/').pop();
            var row = $('<tr>').data('file', fontName)
                .append($('<td>').addClass('strong').text(fontName))
                .append($('<td>').append(this.makeSelect("weight['"+ fontName +"']", this.weightOptions, this.getWeight(fontName))))
                .append($('<td>').append(this.makeSelect("style['"+ fontName +"']", this.styleOptions, this.getStyle(fontName))))
                .append($('<td>').append($('<a>').prop("href", "#").addClass('btn btn-sm btn-danger').html($('<i>').addClass('delete'))))
            rows.append(row);
        }
    },

    removeItem:function (font) {
        // todo: make functionality
    },

    clearList: function () {
        var rows = document.getElementById("font-table");
        rows = $("tbody", rows);
        rows.empty();
    },

    getWeight: function (font) {
        var weight = "400";
        // todo: make functionality

        return weight;
    },

    getStyle: function (font) {
        var style = 'normal';
        // todo: make functionality

        return style;
    },

    makeSelect: function (name, options, current) {
        var selectGroup = $('<select>').addClass('form-control').prop("name", name);
        for(var val in options) {
            if(options.hasOwnProperty(val)) {
                var option = $('<option>').text(options[val]);
                if(current === val) {
                    option.attr("selected", "selected");
                }
                selectGroup.append(option);
            }
        }
        return selectGroup;
    },

    buildMenu: function () {

        var fileMenu = new nw.MenuItem({
            label: "File",
            key: "f",
            modifiers: "alt"
        });

        var menu = new nw.Menu({type: "menubar"});

        var fileSubMenu = new nw.Menu();
        fileSubMenu.append(new nw.MenuItem({
            label: "Settings",
            click: function () {
                // TODO: make settings window
            },
            key: "s",
            modifiers: "alt"
        }));
        fileSubMenu.append(new nw.MenuItem({type: "separator"}));
        fileSubMenu.append(new nw.MenuItem({
            label: "About",
            click: function () {
                // todo: make about window
            },
            key: "a",
            modifiers: "alt"
        }));

        fileMenu.submenu = fileSubMenu;

        menu.append(fileMenu);

        win.menu = menu;
    }
};

app.init();