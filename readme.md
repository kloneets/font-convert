# Font converter

Soft is in alpha stage and is tested only on ubuntu linux. It depends on `fontforge`.

## How to run

Binary releases is coming, but for now you can run it this way (not tested on windows or mac)
* install `fontForge` to your path. 
```bash
# debian like
sudo apt get install fontforge

#gentoo
emerge -av fontforge

# others:
# use package managers or sources at https://fontforge.github.io/en-US/
```
* `npm install` - install all dependencies
* `gulp default` - compile/copy assets
* `gulp watch` (optional for developers) - watch js/scss files
* `npm start` - starts project 