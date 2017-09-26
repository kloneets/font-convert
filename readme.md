# Font converter

Please do not use it, its in heavy development and for now does nothing :D
If you are interested in this kind of app, push `watch` button

## For developers

If you want to help me, clone repository. Then run those commands from terminal:
* `npm install` - install all dependencies
* `gulp default` - compile/copy assets
* `gulp watch` - watch js/scss files
* `npm start` - starts project 

Structure
```text
font-convert
|-assets
| |-css (compiled css)
| |-fonts
| | |-bootstrap(bootstrap icon fonts)
| |   |- ...
| |-js
| | |-dev (development ES6)
| | | |- ...
| | |- *.js (compiled js files - most likely only app.js)
| |-maps (source maps for assets)
| |-sass (sass files)
|-node_modules (only after npm install)
|-.gitignore
|-gulpfile.js
|-index.html - app start
|-pakage.json
|-readme.md
```

### Still planned

* make css for fonts
* make demo html for fonts
* convert to otf
* convert to ttf
* convert to svg
* convert to eot
* convert to woff
* convert to woff2
* save all to directory