# BAD APPLE

this is a silly project i made to torture myself
spent too much time on it..

i adjusted some node modules so if you dont want to download the whole `node_modules` you can just

make a folder in the directory named `node_modules`
open command prompt and
```sh
cd <main-directory>
npm i fluent-ffmpeg @ffmpeg-installer/ffmpeg ffplay jimp @jimp/utils
```

but you **need** to add & replace `node_modules/@ffmpeg-installer/win32-x64` with the one in the repository in the same dir
and `node_modules/ffplay/lib/ffplay.js` with the one i edited in the repository as well 

if you don't want to do all that you can just download the whole thing;

# After

after you extracted the video frames you should comment the `extractFrames` function
unless you want to change the framerate or the scale again

```js
// index.js

(async () => {
  // type the "//" in front to comment out the function after you already used it
  // await extractFrames("/video/badapple.mp4", "/frames", 30, "240x180");

  playAscii("/video/badapple.mp3", "/frames", true);
})();
```
