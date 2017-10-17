/**
 * @version v1.0.0
 * @author Janis Rublevskis <janis@xit.lv>
 * @todo check if fontforge installed on windows
 * @todo check if fontforge installed on osx
 * @todo add loader while initialising system
 */
"use strict";

var path = require("path"),
    fs = require("fs"),
    exec = require("child_process").execSync,
    bn = require("bootstrap.native"),
    os = require("os"),
    ByteBuffer = require('microbuffer');

document.title += ' ' + process.env.npm_package_version;

/**
 * Offsets in EOT file structure. Refer to EOTPrefix in OpenTypeUtilities.cpp
 */
var EOT_OFFSET = {
    LENGTH:         0,
    FONT_LENGTH:    4,
    VERSION:        8,
    CHARSET:        26,
    MAGIC:          34,
    FONT_PANOSE:    16,
    ITALIC:         27,
    WEIGHT:         28,
    UNICODE_RANGE:  36,
    CODEPAGE_RANGE: 52,
    CHECKSUM_ADJUSTMENT: 60
};

/**
 * Offsets in different SFNT (TTF) structures. See OpenTypeUtilities.cpp
 */
var SFNT_OFFSET = {
    // sfntHeader:
    NUMTABLES:      4,

    // TableDirectoryEntry
    TABLE_TAG:      0,
    TABLE_OFFSET:   8,
    TABLE_LENGTH:   12,

    // OS2Table
    OS2_WEIGHT:         4,
    OS2_FONT_PANOSE:    32,
    OS2_UNICODE_RANGE:  42,
    OS2_FS_SELECTION:   62,
    OS2_CODEPAGE_RANGE: 78,

    // headTable
    HEAD_CHECKSUM_ADJUSTMENT:   8,

    // nameTable
    NAMETABLE_FORMAT:   0,
    NAMETABLE_COUNT:    2,
    NAMETABLE_STRING_OFFSET:    4,

    // nameRecord
    NAME_PLATFORM_ID:   0,
    NAME_ENCODING_ID:   2,
    NAME_LANGUAGE_ID:   4,
    NAME_NAME_ID:       6,
    NAME_LENGTH:        8,
    NAME_OFFSET:        10
};

/**
 * Sizes of structures
 */
var SIZEOF = {
    SFNT_TABLE_ENTRY:   16,
    SFNT_HEADER:        12,
    SFNT_NAMETABLE:          6,
    SFNT_NAMETABLE_ENTRY:    12,
    EOT_PREFIX: 82
};

/**
 * Magic numbers
 */
var MAGIC = {
    EOT_VERSION:    0x00020001,
    EOT_MAGIC:      0x504c,
    EOT_CHARSET:    1,
    LANGUAGE_ENGLISH:   0x0409
};

/**
 * Utility function to convert buffer of utf16be chars to buffer of utf16le
 * chars prefixed with length and suffixed with zero
 */
function strbuf(str) {
    var b = new ByteBuffer(str.length + 4);

    b.setUint16(0, str.length, true);

    for (var i = 0; i < str.length; i += 2) {
        b.setUint16(i + 2, str.getUint16 (i), true);
    }

    b.setUint16(b.length - 2, 0, true);

    return b;
}


function ttf2eot(arr) {
    var buf = new ByteBuffer(arr);
    var out = new ByteBuffer(SIZEOF.EOT_PREFIX),
        i, j;

    out.fill(0);
    out.setUint32(EOT_OFFSET.FONT_LENGTH, buf.length, true);
    out.setUint32(EOT_OFFSET.VERSION, MAGIC.EOT_VERSION, true);
    out.setUint8(EOT_OFFSET.CHARSET, MAGIC.EOT_CHARSET);
    out.setUint16(EOT_OFFSET.MAGIC, MAGIC.EOT_MAGIC, true);

    var familyName = [],
        subfamilyName = [],
        fullName = [],
        versionString = [];

    var haveOS2 = false,
        haveName = false,
        haveHead = false;

    var numTables = buf.getUint16 (SFNT_OFFSET.NUMTABLES);

    for (i = 0; i < numTables; ++i) {
        var data = new ByteBuffer(buf, SIZEOF.SFNT_HEADER + i * SIZEOF.SFNT_TABLE_ENTRY);
        var tableEntry = {
            tag: data.toString(SFNT_OFFSET.TABLE_TAG, 4),
            offset: data.getUint32 (SFNT_OFFSET.TABLE_OFFSET),
            length: data.getUint32 (SFNT_OFFSET.TABLE_LENGTH)
        };

        var table = new ByteBuffer(buf, tableEntry.offset, tableEntry.length);

        if (tableEntry.tag === 'OS/2') {
            haveOS2 = true;

            for (j = 0; j < 10; ++j) {
                out.setUint8 (EOT_OFFSET.FONT_PANOSE + j, table.getUint8 (SFNT_OFFSET.OS2_FONT_PANOSE + j));
            }

            /*jshint bitwise:false */
            out.setUint8 (EOT_OFFSET.ITALIC, table.getUint16 (SFNT_OFFSET.OS2_FS_SELECTION) & 0x01);
            out.setUint32 (EOT_OFFSET.WEIGHT, table.getUint16 (SFNT_OFFSET.OS2_WEIGHT), true);

            for (j = 0; j < 4; ++j) {
                out.setUint32 (EOT_OFFSET.UNICODE_RANGE + j * 4, table.getUint32 (SFNT_OFFSET.OS2_UNICODE_RANGE + j * 4), true);
            }

            for (j = 0; j < 2; ++j) {
                out.setUint32 (EOT_OFFSET.CODEPAGE_RANGE + j * 4, table.getUint32 (SFNT_OFFSET.OS2_CODEPAGE_RANGE + j * 4), true);
            }

        } else if (tableEntry.tag === 'head') {

            haveHead = true;
            out.setUint32 (EOT_OFFSET.CHECKSUM_ADJUSTMENT, table.getUint32 (SFNT_OFFSET.HEAD_CHECKSUM_ADJUSTMENT), true);

        } else if (tableEntry.tag === 'name') {

            haveName = true;

            var nameTable = {
                format: table.getUint16 (SFNT_OFFSET.NAMETABLE_FORMAT),
                count: table.getUint16 (SFNT_OFFSET.NAMETABLE_COUNT),
                stringOffset: table.getUint16 (SFNT_OFFSET.NAMETABLE_STRING_OFFSET)
            };

            for (j = 0; j < nameTable.count; ++j) {
                var nameRecord = new ByteBuffer(table, SIZEOF.SFNT_NAMETABLE + j * SIZEOF.SFNT_NAMETABLE_ENTRY);
                var name = {
                    platformID: nameRecord.getUint16 (SFNT_OFFSET.NAME_PLATFORM_ID),
                    encodingID: nameRecord.getUint16 (SFNT_OFFSET.NAME_ENCODING_ID),
                    languageID: nameRecord.getUint16 (SFNT_OFFSET.NAME_LANGUAGE_ID),
                    nameID: nameRecord.getUint16 (SFNT_OFFSET.NAME_NAME_ID),
                    length: nameRecord.getUint16 (SFNT_OFFSET.NAME_LENGTH),
                    offset: nameRecord.getUint16 (SFNT_OFFSET.NAME_OFFSET)
                };

                if (name.platformID === 3 && name.encodingID === 1 && name.languageID === MAGIC.LANGUAGE_ENGLISH) {
                    var s = strbuf (new ByteBuffer(table, nameTable.stringOffset + name.offset, name.length));

                    switch (name.nameID) {
                        case 1:
                            familyName = s;
                            break;
                        case 2:
                            subfamilyName = s;
                            break;
                        case 4:
                            fullName = s;
                            break;
                        case 5:
                            versionString = s;
                            break;
                    }
                }
            }
        }
        if (haveOS2 && haveName && haveHead) { break; }
    }

    if (!(haveOS2 && haveName && haveHead)) {
        throw new Error ('Required section not found');
    }

    // Calculate final length
    var len =
        out.length +
        familyName.length +
        subfamilyName.length +
        versionString.length +
        fullName.length +
        2 +
        buf.length;

    // Create final buffer with the the same array type as input one.
    var eot = new ByteBuffer(len);

    eot.writeBytes(out.buffer);
    eot.writeBytes(familyName.buffer);
    eot.writeBytes(subfamilyName.buffer);
    eot.writeBytes(versionString.buffer);
    eot.writeBytes(fullName.buffer);
    eot.writeBytes([ 0, 0 ]);
    eot.writeBytes(buf.buffer);

    eot.setUint32(EOT_OFFSET.LENGTH, len, true); // Calculate overall length

    return eot;
}


var win = nw.Window.get();

var helper = {
    extend: function () {
        for (var i = 1; i < arguments.length; i++)
            for (var key in arguments[i])
                if (arguments[i].hasOwnProperty(key))
                    arguments[0][key] = arguments[i][key];
        return arguments[0];
    },
    addEvent: function (el, type, handler) {
        if (el.attachEvent) el.attachEvent('on' + type, handler); else el.addEventListener(type, handler);
    },

    live: function (event, selector, callback, context) {
        if (selector.match(/^#/)) {
            selector = selector.replace(/^#/, '');
            this.addEvent(context || document, event, function (e) {
                var found, el = e.target || e.srcElement;
                while (el && !(found = el.id === selector)) el = el.parentElement;
                if (found) callback.call(el, e);
            });
        } else {
            this.addEvent(context || document, event, function (e) {
                var qs = (context || document).querySelectorAll(selector);
                if (qs) {
                    var el = e.target || e.srcElement, index;
                    while (el && ((index = Array.prototype.indexOf.call(qs, el)) === -1)) {
                        el = el.parentElement;
                    }
                    if (index > -1) callback.call(el, e);
                }
            });
        }

    },
    show: function (el) {
        el.style.display = 'block';
    },

    hide: function (el) {
        el.style.display = 'none';
    },

    append: function (el, data) {
        el.appendChild(this.html2element(data));
    },

    prepend: function (el, data) {
        el.insertBefore(this.html2element(data), el.firstChild);
    },

    html2element: function (html) {
        var template = document.createElement('template');
        template.innerHTML = html;
        return template.content.firstChild;
    },
    debugLines: 1,
    debug: function (data) {
        var dw = this.createDebugWin();
        console.log(data);
        if(typeof data === 'object') {
            data = JSON.stringify(data);
        }
        dw.value = "\n" + this.debugLines++ + '. ' + data.toString() + dw.value;
    },
    createDebugWin: function () {
        var dw = document.getElementById('debug-window');
        if (dw === null) {
            var newDw = '<div class="form-group">' +
                '    <label for="exampleFormControlTextarea1">Debug window</label>' +
                '    <textarea id="debug-window" class="form-control" id="exampleFormControlTextarea1" rows="3"></textarea>' +
                '  </div>';
            this.append(document.querySelector('.container'), newDw);
            dw = document.getElementById('debug-window');
        }
        return dw;
    }
};

var app = {

    init: function () {
        /**
         * All _blank links to external browser
         */
        var scope = this;
        helper.live('click', 'a[target=_blank]', function (event) {
            event.preventDefault();
            nw.Shell.openExternal(this.href);
            if (scope.isDebug()) {
                helper.debug('External click: ' + this.href);
            }
        });


        this.initSettings();
        this.debugger();
        this.emptyTemp();
        this.buildMenu();
        this.fileChooser();
        this.removeItem();
        this.clearList();
        this.generateFonts();
        this.clickEvents();

        /**
         * TODO: clear Temp folder on run
         */
    },

    /** =========================== settings ===================================== **/
    /**
     * default settings
     */
    defaultSettings: {
        debug: 1,
        settingsFile: 'font-convert-settings.json',

        /**
         * path to fontforge executable
         */
        fontForgePath: null
    },

    /**
     * settings generated by initSettings
     */
    settings: {},

    settingsWindow: function (options) {
        options = options || {
            focus: ''
        };
        if (this.isDebug()) {
            helper.debug("Settings window opened");
        }
        if (options.focus) {
            document.getElementById('settings-window').addEventListener("shown.bs.modal", function () {
                try {
                    document.getElementById(options.focus).focus();
                } catch (e) {
                }
            }, false);
        }
        this.settingsModal.show();
    },

    /**
     * Add setting to property
     *
     * @param key
     * @param value
     */
    settingsSet: function (key, value) {
        this.settings[key] = value;
    },

    settingsGet: function (key) {
        return this.settings[key] || null;
    },

    /**
     * reload settings
     * @param newSettings object
     */
    reloadSettings: function (newSettings) {
        if (newSettings) {
            this.settings = helper.extend(this.settings, newSettings)
        }

        var debugWindow = document.getElementById("debug-window");
        if (!this.settingsGet("debug")) {
            if (debugWindow) {
                debugWindow = debugWindow.parentNode;
                debugWindow.parentNode.removeChild(debugWindow);
            }
        } else {
            if (!debugWindow) {
                helper.createDebugWin();
            }
        }
    },

    /**
     * save settings to file
     *
     * @param settings object
     */
    saveSettings: function (settings) {
        var filePath = path.join(nw.App.dataPath, this.settings.settingsFile);
        var success = false;
        try {
            fs.writeFileSync(filePath, JSON.stringify(settings), "utf8");
            success = true;
            if (this.isDebug()) {
                helper.debug("Settings saved to: " + filePath);
            }
        } catch (e) {
            if (this.isDebug()) {
                helper.debug("There was an error attempting to save your data.");
            }
        }

        return success;
    },

    putSettingsToView: function (settings) {
        this.putSettingToView("fontForgePath", settings.fontForgePath || "");
        this.putSettingToView("debug", settings.debug || "");
    },

    putSettingToView: function (id, val) {
        switch (id) {
            case "debug": //checkbox
                document.getElementById(id).checked = parseInt(val, 10) === 1;
                break;
            default:
                document.getElementById(id).value = val;
                break;
        }
    },

    /**
     * init settings
     */
    initSettings: function () {
        var scope = this;
        this.reloadSettings(this.defaultSettings);
        var settings = {};
        try {
            settings = JSON.parse(fs.readFileSync(path.join(nw.App.dataPath, this.settings.settingsFile)).toString("utf-8"));
        } catch (e) {
            if (this.isDebug()) {
                helper.debug('Settings file cannot be found! No saved yet');
            }
        }

        this.reloadSettings(settings);

        this.putSettingsToView(settings);

        helper.live('click', '#save-settings', function (event) {
            event.preventDefault();
            var fontForgeField = document.getElementById('fontForgePath');
            var fontForgePath = fontForgeField.value.replace(/^\s+/, '').replace(/\s+/, '').replace(/\r?\n|\r/g, '');
            var canHide = true;
            if (fontForgePath !== '' && fontForgePath !== settings.fontForgePath) {
                if (scope.checkForFontForge(fontForgePath)) {
                    settings.fontForgePath = fontForgePath;
                } else {
                    canHide = false;
                    fontForgeField.classList.add("is-invalid");
                }
            } else {
                fontForgeField.classList.remove("is-invalid");
            }

            settings.debug = document.getElementById("debug").checked ? 1 : 0;
            scope.reloadSettings(settings);
            scope.putSettingsToView(settings);
            if (!scope.saveSettings(scope.settings)) {
                scope.showWarning("Could not save settings to system. Please check permissions for: <strong>" + nw.App.dataPath + "</strong>");
            }
            if (canHide) {
                scope.settingsModal.hide();
            }
        });

        helper.live('click', '#cancel-settings', function () {
            scope.putSettingsToView(settings);
        });

        if (!this.settingsGet("fontForgePath")) {
            this.checkForFontForge();
        }
    },

    /** ----------------------- settings ----------------------- **/

    allowedFontTypes: ["ttf", "otf"],
    fontFiles: [],

    clearButton: document.getElementById('clear-list'),
    convertFontsButton: document.getElementById('convert-fonts'),
    statusBar: document.getElementById('status-bar'),
    loader: document.getElementById('loader'),
    settingsModal: (new bn.Modal(document.getElementById('settings-window'))),
    aboutModal: (new bn.Modal(document.getElementById('about'))),


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

    isDebug: function () {
        return this.settings.debug === 1;
    },

    debugger: function () {
        if (this.isDebug()) {
            helper.debug("App Config path: " + nw.App.dataPath);
            helper.debug("Temp path:" + this.tempPath);
        }
    },

    /**
     * Setting message in status bar
     * @param message
     */
    setStatusMessage: function (message) {
        this.statusBar.innerHTML = message;
    },

    /**
     * setting warning message
     * @param text
     */
    showWarning: function (text) {
        var warnings = document.getElementsByClassName('alert-danger');
        if (warnings.length > 0) {
            warnings[0].innerHTML = text;
        } else {
            helper.prepend(document.getElementsByClassName('container')[0], '<div class="alert alert-danger alert-dismissible fade show" role="alert">' + text + '</div>');
        }
    },

    clickEvents: function () {
        var scope = this;
        helper.live('click', '.show-settings', function (event) {
            var el = this;
            var options = {
                focus: el.dataset.focus
            };
            event.preventDefault();
            scope.settingsWindow(options);
        });
    },

    fileChooser: function () {
        var scope = this;
        document.getElementById('chose-fonts').addEventListener('click', function (event) {
            event.preventDefault();

            var chooser = document.querySelector("#fonts");
            chooser.addEventListener("change", function () {
                scope.parseFonts(this.value);
                scope.rebuildList();
                this.value = '';
            }, false);

            chooser.click();
        }, false);
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

        if (this.fontFiles.length > 0) {
            helper.show(this.clearButton);
            helper.show(this.convertFontsButton);
            this.setStatusMessage("Fonts loaded");
        } else {
            helper.hide(this.clearButton);
            helper.hide(this.convertFontsButton);
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
        var tBody = document.querySelector("#font-table tbody");

        var currentList = this.currentList();

        tBody.innerHTML = '';

        for (var i = 0; i < this.fontFiles['length']; i++) {
            var font = path.normalize(this.fontFiles[i]);
            var fontName = font.split('/').pop();
            var curWeight = null, curStyle = null, curName = '';

            if (typeof currentList[fontName] !== 'undefined') {
                curWeight = currentList[fontName].weight;
                curStyle = currentList[fontName].style;
                curName = currentList[fontName].name;
            } else {
                curWeight = this.getWeight(fontName);
                curStyle = this.getStyle(fontName);
                curName = fontName.replace(/\.[a-z]+$/i, '');
                curName = curName.replace(/-[a-z0-9]+$/i, '');
            }

            var html = '<tr data-file="' + font + '" data-name="' + fontName + '">'
                + '<td class="strong">' + fontName + '</td>'
                + '<td><input class="form-control" name="name[\'' + fontName + '\']" value="' + curName + '"></td>'
                + '<td>' + this.makeSelect("weight['" + fontName + "']", this.weightOptions, curWeight) + '</td>'
                + '<td>' + this.makeSelect("style['" + fontName + "']", this.styleOptions, curStyle) + '</td>'
                + '<td><a href="#" class="btn btn-sm btn-danger remove-font"><i class="delete"></i></a></td>'
                + '</tr>';
            helper.append(tBody, html);
        }
    },

    removeItem: function () {
        var scope = this;
        helper.live('click', '.remove-font', function (event) {
            event.preventDefault();

            var row = this.parentNode.parentNode;
            for (var i = 0; i < scope.fontFiles.length; i++) {
                if (scope.fontFiles.hasOwnProperty(i)) {
                    if (scope.fontFiles[i] === row.dataset.file) {
                        scope.fontFiles.splice(i, 1);
                        break;
                    }
                }
            }

            scope.setStatusMessage("Font <strong>" + row.dataset.name + "</strong> removed");

            row.parentNode.removeChild(row);

            if (scope.fontFiles.length === 0) {
                helper.hide(scope.clearButton);
                helper.hide(scope.convertFontsButton);
            }

        });
    },

    clearList: function () {
        var scope = this;
        this.clearButton.addEventListener('click', function (event) {
            event.preventDefault();
            var rows = document.querySelector("#font-table tbody");
            rows.innerHTML = '';
            this.fontFiles = [];
            helper.hide(this);
            scope.setStatusMessage("Font list cleared");
        }, false);
    },

    getWeight: function (font) {
        var regexp;
        //thin
        regexp = /(extralightthin|extralightitalic)\.(ttf|otf)$/i;
        if (font.match(regexp)) return "100";

        //thin
        regexp = /(thin|thinitalic)\.(ttf|otf)$/i;
        if (font.match(regexp)) return "200";

        //light
        regexp = /(book|demi|light|bookitalic|demiitalic|lightitalic)\.(ttf|otf)$/i;
        if (font.match(regexp)) return "300";

        //medium
        regexp = /(medium|mediumitalic)\.(ttf|otf)$/i;
        if (font.match(regexp)) return "500";

        //semi-bold
        regexp = /(semibold|demibold|demibolditalic|semibolditalic)\.(ttf|otf)$/i;
        if (font.match(regexp)) return "600";

        //black
        regexp = /(flat|extrablack|extrablackitalic|flatitalic|poster|posteritalic|utlrablack|ultrablackitalic)\.(ttf|otf)$/i;
        if (font.match(regexp)) return "900";

        //bold
        regexp = /(black|heavy|extrabold|blackitalic|heavyitalic|extrabolditalic)\.(ttf|otf)$/i;
        if (font.match(regexp)) return "800";

        //bold
        regexp = /(bold|bolditalic)\.(ttf|otf)$/i;
        if (font.match(regexp)) return "700";

        //default regular
        return "400";
    },

    getStyle: function (font) {
        if (font.match(/(italic|it)\.(ttf|otf)$/i)) return "italic";
        return "normal";
    },

    makeSelect: function (name, options, current) {
        var selectGroup = '<select class="form-control" name="' + name + '">';
        for (var val in options) {
            if (options.hasOwnProperty(val)) {
                selectGroup += '<option value="' + val + '" ' + (current === val ? 'selected="selected"' : '') + '>' + options[val] + '</option>';
            }
        }
        selectGroup += '</select>';
        return selectGroup;
    },

    currentList: function () {
        var tBody = document.querySelector("#font-table tbody");
        var currentList = [];

        for (var i = 0, row; row = tBody.rows[i]; i++) {
            var selects = row.getElementsByTagName('select');
            var fontName = row.dataset.name;
            var name = row.getElementsByTagName('input')[0].value;
            var path = row.dataset.file;
            currentList[fontName] = {
                weight: selects[0].options[selects[0].selectedIndex].value,
                style: selects[1].options[selects[1].selectedIndex].value,
                path: path,
                name: name
            }
        }

        return currentList;
    },

    generateFonts: function () {
        var scope = this;
        this.convertFontsButton.addEventListener('click', function (event) {
            event.preventDefault();
            var currentList = scope.currentList();
            if (Object.keys(currentList).length > 0) {
                for (var fontName in currentList) {
                    if (currentList.hasOwnProperty(fontName)) {
                        var ext = scope.getExtension(fontName);
                        var ttfFont = null;
                        scope.copy(currentList[fontName].path, scope.tempPath);
                        if (ext === 'otf') {
                            ttfFont = scope.makeTTF(currentList[fontName].path);
                            helper.debug(ttfFont);
                        } else {
                            ttfFont = scope.ttfInfo(currentList[fontName].path);
                            helper.debug(ttfFont);
                        }

                        scope.makeEOT(ttfFont);
                    }
                    
                }
            } else {
                scope.setStatusMessage("Font list is empty. Nothing to do");
                helper.hide(scope.convertFontsButton);
            }
        }, false);
    },

    /**
     *
     * @param script
     * @param font
     * @returns {Buffer | string}
     */
    fontForge: function (script, font) {
        var cmd = this.settingsGet('fontForgePath') + ' -script "' + script + '" "' + font + '" "' + this.tempPath + '"';
        console.log(cmd);
        return JSON.parse(exec(cmd).toString("utf8"));
    },

    /**
     *
     * @param ttfFont string
     * @returns {*|Buffer|string}
     */
    ttfInfo: function (ttfFont) {
        var script = path.join(process.cwd(), 'shell-scripts', 'ttfInfo.pe');
        return this.fontForge(script, ttfFont);
    },

    /**
     *
     * @param otfFont string
     * @returns {*|Buffer|string}
     */
    makeTTF: function (otfFont) {
        var script = path.join(process.cwd(), 'shell-scripts', 'otf2ttf.pe');
        return this.fontForge(script, otfFont);
    },

    /**
     *
     * @param ttfFont object
     * @returns {*}
     */
    makeEOT: function (ttfFont) {
        /**
         * @typedef {string} ttfFont.fontPath
         * @typedef {string} ttfFont.fontFile
         * @type {Buffer | string}
         */
        var input = fs.readFileSync(path.join(ttfFont.fontPath, ttfFont.fontFile));
        var ttf = new Uint8Array(input);
        var eot = new Buffer(ttf2eot(ttf).buffer);
        var fontFile = ttfFont.fontFile.replace(/\.ttf$/, '') + '.eot';
        fs.writeFileSync(path.join(this.tempPath, fontFile), eot);
        return helper.extend(ttfFont, { fontFile: fontFile});
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
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir);
        }

        var targetFile = path.join(targetDir, newName);

        var rd = fs.createReadStream(sourceFile);
        rd.on("error", function (error) {
            helper.debug(error);
        });

        var wr = fs.createWriteStream(targetFile);
        wr.on("error", function (error) {
            helper.debug(error);
        });
        wr.on("close", function () {
            if (scope.isDebug()) helper.debug("Done");
        });
        rd.pipe(wr);

    },

    deleteFile: function (file) {
        if (!fs.existsSync(file)) {
            return true;
        }

        var success = true;
        fs.unlink(file, function (err) {
            if (err) {
                helper.debug(err);
                success = false;
            }
        });

        if (this.isDebug()) {
            helper.debug("Deleted: " + file);
        }

        return success;
    },

    emptyTemp: function () {
        var scope = this;
        fs.readdir(this.tempPath, function (err, list) {
            if (!err) {
                for (var i = 0; i < list.length; i++) {
                    scope.deleteFile(path.join(scope.tempPath, list[i]));
                }
            }
        });
    },

    /**
     * get fontforge Path
     */
    checkForFontForge: function (rewritePath) {
        rewritePath = rewritePath || false;
        var fontForgePath = false;
        var stdout = null;
        if (rewritePath) {
            try {
                rewritePath = rewritePath.replace(/\r?\n|\r/g, '');
                stdout = exec(rewritePath + ' -version');
                this.settingsSet("fontForgePath", rewritePath);
                if (this.isDebug()) {
                    helper.debug("Custom ff path: " + stdout.toString());
                }
                return true;
            } catch (e) {
                if (this.isDebug()) {
                    helper.debug(e);
                }
                return false;
            }
        }
        switch (os.platform()) {
            case 'darvin' : // macOs
                // get command
                break;
            case 'linux':
                try {
                    stdout = exec('command -v fontforge');
                    fontForgePath = stdout.toString();
                    if (this.isDebug()) {
                        helper.debug("command: " + fontForgePath);
                    }
                    this.settingsSet("fontForgePath", fontForgePath.replace(/\r?\n|\r/g, ''));
                } catch (e) {
                    if (this.isDebug()) {
                        helper.debug(e);
                    }
                }
                break;
            case "win32":
            case "win64":
                //windows
                break;
            default:
                return false;
        }

        if (!this.settingsGet("fontForgePath")) {
            this.showWarning("Cannot Find dependency: <strong>fontforge</strong>. Please install it from <a target='_blank' href='https://fontforge.github.io'>FontForge official page</a> or provide path to executable in <a href='#' data-focus='fontForgePath' class='show-settings'>Settings</a>!");
        }
    },

    buildMenu: function () {

        var scope = this;

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
                scope.settingsWindow();
            },
            key: "s",
            modifiers: "alt"
        }));
        fileSubMenu.append(new nw.MenuItem({type: "separator"}));
        fileSubMenu.append(new nw.MenuItem({
            label: "About",
            click: function () {
                // todo: add version from package
                scope.aboutModal.show();
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