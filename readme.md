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
| |-maps (source maps for assets)
| |-sass (sass files)
|-js
| |-dev
| | |- ...
| |- *.js
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
* convert to svg
* convert to woff
* convert to woff2
* save all to directory