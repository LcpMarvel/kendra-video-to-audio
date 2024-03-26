import { PSM, createWorker } from "tesseract.js";
import type { TruncationOptions } from "../src/interface";
import { split } from "../src/slicer";
import data from "./data.json";
import imageSize from "image-size";

describe("slicer", () => {
	it("should be able get truncation Options", () => {
		const options = split(data);

		const lastOption = options[options.length - 1];

		expect(timeFromTruncationOptions(lastOption)).toEqual("25:42");
	});

	it("should be able to recognize text from image", async () => {
		const expected = [
			{
				image: "fixtures/image.png",
				text: "Are you seriously thinking about pursuing a career as a race car driver?",
			},
			{
				image: "fixtures/image2.png",
				text: "My hands are so numb with cold that I cant move my fingers.",
			},
			{
				image: "fixtures/image3.png",
				text: "Give me something to write with. Will this do? Yes, it will do.",
			},
		];

		for (const { image, text } of expected) {
			const resultText = await recognize(image);

			expect(resultText).toEqual(text);
		}
	}, 100000);
});

function timeFromTruncationOptions(options: TruncationOptions): string {
	return secondsToTime(options.startTime + options.duration);
}

function secondsToTime(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;

	if (minutes < 59) {
		return `${minutes}:${remainingSeconds}`;
	}

	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;

	return `${hours}:${remainingMinutes}:${remainingSeconds}`;
}

async function recognize(imagePath: string) {
	const size = imageSize(imagePath);

	if (!size.width || !size.height) {
		return;
	}

	const top = size.height * 0.1;
	const height = size.height - top;

	const rectangle = {
		top,
		left: 0,
		width: size.width,
		height: height,
	};

	const worker = await createWorker("eng");
	await worker.setParameters({
		tessedit_char_whitelist:
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?! ",
		preserve_interword_spaces: "1",
		tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
	});

	const {
		data: { text },
	} = await worker.recognize(imagePath, {
		rectangle,
	});

	return text.split("\n\n")[0].replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}
