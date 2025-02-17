const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
const fs = require("node:fs/promises");
const ffplay = require("ffplay");
const { Worker } = require("worker_threads"); // because i used to convert like 6569 frames everytime lol

ffmpeg.setFfmpegPath(ffmpegPath);

async function dirExist(dirPath) {
	try {
		await fs.access(dirPath, fs.constants.F_OK);
		
		return true;
	} catch (err) {
		return false;
	}
}

async function makeDir(dirPath) {
	const exist = await dirExist(dirPath);

	if (!exist) {
		return await fs.mkdir(dirPath);
	}
}

async function extractFrames(videoPath, outputDir, frameRate = 30, scale = "240x180") {
	console.log("extracting frames..")

	await makeDir(__dirname + outputDir);

	return await new Promise((resolve, reject) => {
		new ffmpeg(__dirname + videoPath)
			.on("error", (err) => reject(err))
			.on("end", () => resolve())
			.outputOptions([`-vf fps=${frameRate}`, `-s ${scale}`])
			.save(`${__dirname + outputDir}/frame%d.bmp`);
	});
}

async function playAscii(audioPath, framesDir, useCached) {
	console.log("converting to ascii..");

	async function displayAscii(frames) {
		const frameDurationMs = 1000 / 30;
		let startTime;

		const player = new ffplay(__dirname + audioPath);
		for (let i = 0; i < frames.length; i++) {
			const frame = frames[i];

			if (!startTime) {
				startTime = Date.now();
			}
			const frameStart = Date.now();

			console.clear();
			process.stdout.write(frame);

			const elapsed = frameStart - startTime;
			const targetTime = i * frameDurationMs;

			let delay = targetTime - elapsed;
			if (delay < 0) delay = 0;

			await new Promise((resolve) => setTimeout(resolve, delay));
		}

		player.stop();
	}

	const cacheExist = await dirExist(__dirname + "/caches");

	if (useCached && cacheExist) {
		const files = await fs.readdir(__dirname + "/caches");
		const sortedFiles = files
			.filter((file) => file.endsWith(".txt"))
			.sort((a, b) => {
				const numA = parseInt(a.match(/frame(\d+)\.txt/)[1]);
				const numB = parseInt(b.match(/frame(\d+)\.txt/)[1]);
				return numA - numB;
			});

		return await displayAscii(
			await Promise.all(sortedFiles.map(async (file) => await fs.readFile(__dirname + "/caches/" + file, { encoding: "utf8" })))
		);
	}

	await makeDir(__dirname + "/caches");
	const files = await fs.readdir(__dirname + framesDir);
	const sortedFiles = files
		.filter((file) => file.endsWith(".bmp"))
		.sort((a, b) => {
			const numA = parseInt(a.match(/frame(\d+)\.bmp/)[1]);
			const numB = parseInt(b.match(/frame(\d+)\.bmp/)[1]);
			return numA - numB;
		})
		.map((file) => __dirname + framesDir + "/" + file);

	let maxWorkers = 12; // change this if your cpu is better or potato
	let nextWorker = 0;
	let remaining;
	const workers = [];

	const chunkSize = Math.ceil(sortedFiles.length / (maxWorkers * 10));
	const chunks = [];

	for (let i = 0; i < maxWorkers; i++) {
		const worker = new Worker(__dirname + "/worker.js");
		workers.push(worker);

		worker.on("message", async (data) => {
			remaining--;
			if (remaining === 0) {
				console.log("all done");

				for (const worker of workers) {
					await worker.terminate();
				}

				await displayAscii(framesChunks.flat());
			}

			console.log("chunks remaining:", remaining);

			framesChunks[data[1]].push(...data[0]);
		});
	}

	for (let i = 0; i < sortedFiles.length; i += chunkSize) {
		chunks.push(sortedFiles.slice(i, i + chunkSize));
	}
	remaining = chunks.length;
	const framesChunks = [...Array(remaining)].map(() => []);

	const promises = chunks.map(async (chunk, index) => {
		const worker = workers[nextWorker];
		worker.postMessage([chunk, index]);

		nextWorker = (nextWorker + 1) % maxWorkers;
	});

	await Promise.all(promises);
}

// after you cached them, if you need to use one of them, you should comment out the other

(async () => {
	// main

	// comment `extractFrames` if you already extracted otherwise it would extract again which is slow
	await extractFrames("/video/badapple.mp4", "/frames", 30, "240x180"); // if you want to change resolution or framerate..

	playAscii("/video/badapple.mp3", "/frames", true);
})();
