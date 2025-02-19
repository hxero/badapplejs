const { parentPort } = require("worker_threads");
const fs = require("fs/promises");
const sharp = require("sharp");
const bmp = require("bmp-js");

class Semaphore {
	constructor(initial) {
		this.count = initial;
		this.queue = [];
	}

	async acquire() {
		if (this.count > 0) {
			this.count--;
			return;
		}

		await new Promise((resolve) => this.queue.push(resolve));
	}

	release() {
		if (this.queue.length > 0) {
			const resolve = this.queue.shift();
			if (resolve) {
				resolve();
			}
		} else {
			this.count++;
		}
	}
}

const semaphore = new Semaphore(1);

async function imageToAscii(imagePath, opts = {}) {
	try {
		const { chars = " ░▒▓█", scale = 70, invert } = opts;

		const buffer = await fs.readFile(imagePath);
		const bitmap = bmp.decode(buffer);
		const image = sharp(bitmap.data, {
			raw: {
				width: bitmap.width,
				height: bitmap.height,
				channels: 4,
			},
		}).grayscale();

		/*
		const metadata = await image.metadata();
		const width = metadata.width;
		const height = metadata.height;

		
		if (width > height) {
			resizedWidth = Math.min(width, scale);
			resizedHeight = Math.round(height * (resizedWidth / width));
		} else {
			resizedHeight = Math.min(height, scale);
			resizedWidth = Math.round(width * (resizedHeight / height));
		}

		const resizedImage = image.resize(resizedWidth, resizedHeight);

		if (invert) resizedImage.negate();

		const pixels = await resizedImage.raw().toBuffer({ resolveWithObject: true });
		*/

		const pixels = await image.raw().toBuffer({ resolveWithObject: true });
		let asciiArt = "";

		for (let y = 0; y < pixels.info.height; y++) {
			for (let x = 0; x < pixels.info.width; x++) {
				const pixelIndex = (y * pixels.info.width + x) * pixels.info.channels;
				const brightness = pixels.data[pixelIndex];

				const charIndex = Math.floor((brightness / 256) * chars.length);
				asciiArt += chars[charIndex];
			}
			asciiArt += "\n";
		}

		const index = parseInt(imagePath.match(/frame(\d+)\.bmp/)[1]); // sorting
		await fs.writeFile(`${__dirname}/caches/${imagePath.split("/").at(-1).split(".")[0]}.txt`, asciiArt);

		return [asciiArt, index];
	} catch (err) {
		console.error(err);
		return null;
	}
}

parentPort.on("message", async (message) => {
	await semaphore.acquire();

	const data = await Promise.all(message[0].map(imageToAscii));

	semaphore.release();

	parentPort.postMessage([data.sort((a, b) => a[1] - b[1]).map((d) => d[0]), message[1]]);
});
