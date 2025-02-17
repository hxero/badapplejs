const { Jimp } = require("jimp");
const { intToRGBA } = require("@jimp/utils");
const { parentPort } = require("worker_threads");
const fs = require("fs/promises");

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

// prettier-ignore
const brailleMap = {
    0b00000001: "⠁", 0b00000010: "⠂", 0b00000100: "⠃", 0b00001000: "⠄",
    0b00000011: "⠅", 0b00000101: "⠆", 0b00000110: "⠇", 0b00000111: "⠈",
    0b00001001: "⠉", 0b00001010: "⠊", 0b00001011: "⠋", 0b00001100: "⠌",
    0b00001101: "⠍", 0b00001110: "⠎", 0b00001111: "⠏", 0b00010000: "⠐",
    0b00010001: "⠑", 0b00010010: "⠒", 0b00010011: "⠓", 0b00010100: "⠔",
    0b00010101: "⠕", 0b00010110: "⠖", 0b00010111: "⠗", 0b00011000: "⠘",
    0b00011001: "⠙", 0b00011010: "⠚", 0b00011011: "⠛", 0b00011100: "⠜",
    0b00011101: "⠝", 0b00011110: "⠞", 0b00011111: "⠟", 0b00100000: "⠀", // Space
    0b00100001: "⠠", 0b00100010: "⠡", 0b00100011: "⠢", 0b00100100: "⠣",
    0b00100101: "⠤", 0b00100110: "⠥", 0b00100111: "⠦", 0b00101000: "⠧",
    0b00101001: "⠨", 0b00101010: "⠩", 0b00101011: "⠪", 0b00101100: "⠫",
    0b00101101: "⠬", 0b00101110: "⠭", 0b00101111: "⠮", 0b00110000: "⠯",
    0b00110001: "⠰", 0b00110010: "⠱", 0b00110011: "⠲", 0b00110100: "⠳",
    0b00110101: "⠴", 0b00110110: "⠵", 0b00110111: "⠶", 0b00111000: "⠷",
    0b00111001: "⠸", 0b00111010: "⠹", 0b00111011: "⠺", 0b00111100: "⠻",
    0b00111101: "⠼", 0b00111110: "⠽", 0b00111111: "⠿"
};

async function imageToBraille(imagePath) {
	const image = await Jimp.read(imagePath);
	image.greyscale();
	image.contrast(1);

	const width = image.bitmap.width;
	const height = image.bitmap.height;

	let Ascii = "";

	for (let y = 0; y < height; y += 3) {
		// 3 rows (braille height)
		for (let x = 0; x < width; x += 2) {
			// 2 columns (braille width)
			let brailleBinary = 0;

			for (let i = 0; i < 3; i++) {
				// 3 rows
				for (let j = 0; j < 2; j++) {
					// 2 columns
					const px = x + j;
					const py = y + i;

					if (px < width && py < height) {
						const pixelColor = intToRGBA(image.getPixelColor(px, py));
						const brightness = (pixelColor.r + pixelColor.g + pixelColor.b) / 3;

						// set bit for brighter color and blank for darker
						if (brightness > 230) {
							const dotIndex = i * 2 + j; // get binary index
							brailleBinary |= 1 << dotIndex;
						}
					}
				}
			}
			Ascii += brailleMap[brailleBinary] || brailleMap[0b00100000]; // || blank
		}
		Ascii += "\n";
	}

	const index = parseInt(imagePath.match(/frame(\d+)\.bmp/)[1]); // sorting
	await fs.writeFile(`./caches/${imagePath.split("/").at(-1).split(".")[0]}.txt`, Ascii);

	return [Ascii, index];
}

parentPort.on("message", async (message) => {
	await semaphore.acquire();

	const data = await Promise.all(message[0].map(imageToBraille));

	semaphore.release();

	parentPort.postMessage([data.sort((a, b) => a[1] - b[1]).map((d) => d[0]), message[1]]);
});
