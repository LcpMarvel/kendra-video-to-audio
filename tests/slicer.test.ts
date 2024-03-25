import type { TruncationOptions } from "../src/interface";
import { split } from "../src/slicer";
import data from "./data.json";

describe("slicer", () => {
	it("should be able get truncation Options", () => {
		const options = split(data);

		const lastOption = options[options.length - 1];

		expect(timeFromTruncationOptions(lastOption)).toEqual("25:42");
	});
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
