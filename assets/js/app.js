"use strict";

var $ = require("jquery");
var path = require("path");
var fs = require("fs");

document.title += ' ' + process.env.npm_package_version;

var win = nw.Window.get();

var app = {
    debug: true,
    allowedFontTypes: ["ttf", "otf"],
    fontFiles: [],

    clearButton: $(document.getElementById('clear-list')),
    convertFontsButton: $(document.getElementById('convert-fonts')),
    statusBar: $(document.getElementById('status-bar')),
    loader: $(document.getElementById('loader')),

    weightOptions: {
        "100": "Extra light (100)",
        "200": "Thin (200)",
        "300": "Light (300)",
        "400": "Regular (400)",
        "500": "Medium (500)",
        "600": "Semi Bold (600)",
        "700": "Bold (700)",
        "800": "Black (800)",
        "900": "Extra Black (900)"
    },

    styleOptions: {
        "normal": "Normal",
        "italic": "Italic"
    },

    tempPath: path.join(nw.App.dataPath, 'Temp'),

    debugger: function () {
        if(this.debug) {
            console.log("App Config path: ", nw.App.dataPath);
            console.log("Temp path:", this.tempPath);
        }
    },

    setStatusMessage: function (message) {
        this.statusBar.html(message);
    },

    init: function () {
        this.debugger();
        this.buildMenu();
        this.fileChooser();
        this.removeItem();
        this.clearList();
        this.generateFonts();

        /**
         * TODO: clear Temp folder on run
         */
    },

    fileChooser: function () {
        var scope = this;
        $(document).on('click', '#chose-fonts', function (event) {
            event.preventDefault();

            var chooser = document.querySelector("#fonts");
            chooser.addEventListener("change", function () {
                scope.parseFonts(this.value);
                scope.rebuildList();
                this.value = '';
            }, false);

            chooser.click();
        });
    },

    /**
     *
     * @param fonts
     * @returns {*}
     */
    parseFonts: function (fonts) {
        if (fonts) {
            fonts = fonts.split(';');
            for (var i = 0; i < fonts.length; i++) {
                var ext = this.getExtension(fonts[i]);
                if (this.allowedFontTypes.indexOf(ext) !== -1) {
                    if (!this.isDuplicate(fonts[i])) this.fontFiles.push(fonts[i]);
                }
            }
        }

        if(this.fontFiles.length > 0) {
            this.clearButton.show();
            this.convertFontsButton.show();
            this.setStatusMessage("Fonts loaded");
        } else {
            this.clearButton.hide();
            this.convertFontsButton.hide();
            this.setStatusMessage("No fonts found. Please chose ttf or otf font file/s");
        }
    },

    getExtension: function (fontName) {
        return fontName.split('.').pop().toLowerCase();
    },

    isDuplicate: function (font) {
        font = font.replace(/\.(otf|ttf)$/, '');
        for (var i in this.fontFiles) {
            if (this.fontFiles.hasOwnProperty(i)) {
                if (this.fontFiles[i].replace(/\.(otf|ttf)$/, '') === font) {
                    return true;
                }
            }
        }
        return false;
    },

    rebuildList: function () {
        var tBody = document.getElementById("font-table");
        tBody = $("tbody", tBody);

        var currentList = this.currentList();

        tBody.empty();

        for (var i = 0; i < this.fontFiles['length']; i++) {
            var font = path.normalize(this.fontFiles[i]);
            var fontName = font.split('/').pop();
            var curWeight = null, curStyle = null;

            if (typeof currentList[fontName] !== 'undefined') {
                curWeight = currentList[fontName].weight;
                curStyle = currentList[fontName].style;
            } else {
                curWeight = this.getWeight(fontName);
                curStyle = this.getStyle(fontName);
            }

            var row = $('<tr>').data({
                file: font,
                name: fontName
            })
                .append($('<td>').addClass('strong').text(fontName))
                .append($('<td>').append(this.makeSelect("weight['" + fontName + "']", this.weightOptions, curWeight)))
                .append($('<td>').append(this.makeSelect("style['" + fontName + "']", this.styleOptions, curStyle)))
                .append($('<td>').append($('<a>').prop("href", "#").addClass('btn btn-sm btn-danger remove-font').html($('<i>').addClass('delete'))));
            tBody.append(row);
        }
    },

    removeItem: function () {
        var scope = this;
        $(document).on('click', '.remove-font', function (event) {
            event.preventDefault();
            var row = $(this).parent().parent();
            for (var i = 0; i < scope.fontFiles.length; i++) {
                if (scope.fontFiles.hasOwnProperty(i)) {
                    if (scope.fontFiles[i] === row.data("file")) {
                        scope.fontFiles.splice(i, 1);
                        break;
                    }
                }
            }

            scope.setStatusMessage("Font <strong>" + row.data('name') + "</strong> removed");

            row.empty().remove();


            if(scope.fontFiles.length === 0) {
                scope.clearButton.hide();
                scope.convertFontsButton.hide();
            }

        });
    },

    clearList: function () {
        var scope = this;
        this.clearButton.click(function (event) {
            event.preventDefault();
            var rows = document.getElementById("font-table");
            rows = $("tbody", rows);
            rows.empty();
            this.fontFiles = [];
            $(this).hide();
            scope.setStatusMessage("Font list cleared");
        });
    },

    getWeight: function (font) {
        var regexp;
        //thin
        regexp = /(extralightthin|extralightitalic)\.(ttf|otf)$/i;
        if(font.match(regexp)) return "100";

        //thin
        regexp = /(thin|thinitalic)\.(ttf|otf)$/i;
        if(font.match(regexp)) return "200";

        //light
        regexp = /(book|demi|light|bookitalic|demiitalic|lightitalic)\.(ttf|otf)$/i;
        if(font.match(regexp)) return "300";

        //medium
        regexp = /(medium|mediumitalic)\.(ttf|otf)$/i;
        if(font.match(regexp)) return "500";

        //semi-bold
        regexp = /(semibold|demibold|demibolditalic|semibolditalic)\.(ttf|otf)$/i;
        if(font.match(regexp)) return "600";

        //black
        regexp = /(flat|extrablack|extrablackitalic|flatitalic|poster|posteritalic|utlrablack|ultrablackitalic)\.(ttf|otf)$/i;
        if(font.match(regexp)) return "900";

        //bold
        regexp = /(black|heavy|extrabold|blackitalic|heavyitalic|extrabolditalic)\.(ttf|otf)$/i;
        if(font.match(regexp)) return "800";

        //bold
        regexp = /(bold|bolditalic)\.(ttf|otf)$/i;
        if(font.match(regexp)) return "700";

        //default regular
        return "400";
    },

    getStyle: function (font) {
        if(font.match(/(italic|it)\.(ttf|otf)$/i)) return "italic";
        return "normal";
    },

    makeSelect: function (name, options, current) {
        var selectGroup = $('<select>').addClass('form-control').prop("name", name);
        for (var val in options) {
            if (options.hasOwnProperty(val)) {
                var option = $('<option>').val(val).text(options[val]);
                if (current === val) {
                    option.attr("selected", "selected");
                }
                selectGroup.append(option);
            }
        }
        return selectGroup;
    },

    currentList: function () {
        var tBody = document.getElementById("font-table");
        tBody = $("tbody", tBody);

        var currentList = [];

        tBody.find('tr').each(function () {
            var el = $(this);
            var selects = el.find('select');
            var fontName = el.data("name");
            currentList[fontName] = {
                weight: selects.eq(0).find(":selected").val() || scope.getWeight(fontName),
                style: selects.eq(1).find(":selected").val() || scope.getStyle(fontName),
                path: el.data("file")
            };
        });

        return currentList;
    },

    generateFonts: function () {
        var scope = this;
        this.convertFontsButton.click(function (event) {
            event.preventDefault();
            var currentList = scope.currentList();
            if(Object.keys(currentList).length > 0) {
                for(var fontName in currentList) {
                    if(currentList.hasOwnProperty(fontName)) {
                        var ext = scope.getExtension(fontName);
                        var otfFont = null;
                        var ttfFont = null;
                        scope.copy(currentList[fontName].path, scope.tempPath);
                        if(ext === 'ttf') {
                            otfFont = scope.makeOTF(currentList[fontName].path);
                        } else {
                            ttfFont = scope.makeTTF(currentList[fontName].path);
                        }

                    }
                }
            } else {
                scope.setStatusMessage("Font list is empty. Nothing to do");
                scope.convertFontsButton.hide();
            }
        });
    },

    makeOTF: function (ttfFont) {

    },

    makeTTF: function (otfFont) {

    },

    makeEOT: function (otfFont) {

    },

    makeSVG: function (otfFont) {

    },

    makeWOFF: function (otfFont) {

    },

    makeWOFF2: function (otfFont) {

    },

    copy: function (sourceFile, targetDir, newName) {
        var scope = this;
        newName = newName || sourceFile.split('/').pop();
        if (!fs.existsSync(targetDir)){
            fs.mkdirSync(targetDir);
        }

        var targetFile = path.join(targetDir, newName);



        var rd = fs.createReadStream(sourceFile);
        rd.on("error", function (error) {
            console.log(error);
        });

        var wr = fs.createWriteStream(targetFile);
        wr.on("error", function (error) {
            console.log(error);
        });
        wr.on("close", function () {
            if(scope.debug) console.log("Done");
        });
        rd.pipe(wr);

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
                // todo: make "about" window
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