# BAD APPLE

this is a silly project i made to torture myself
spent too much time on it..

# NOTE

change the maxWorker to lower if you can hear your CPU crying
and if you have good cpu you can set it higher for faster processing
```js
// index.js

line 100:  let maxWorker = 12 // change this
```

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
