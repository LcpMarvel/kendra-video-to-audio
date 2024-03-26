import { Lyric, retext } from "../src/lyric";
import { split } from "../src/slicer";
import data from "./data.json";
import NodeID3, { TagConstants } from "node-id3";
import * as path from "node:path";

describe("lyric", () => {
	it("should be able to make synchronised lyrics", () => {
		const options = split(data);

		const lastOption = options[options.length - 1];

		const lyric = new Lyric(lastOption.lyric);
		const result = lyric.synchronisedLyric();

		expect(result.synchronisedText[0].timeStamp).toEqual(0);
	});

	it("should be able to format timestamp", () => {
		const lyric = new Lyric([]);

		expect(lyric.timestampText(1000)).toEqual("00:01.000");
		expect(lyric.timestampText(60000)).toEqual("01:00.000");
	});

	// TODO: fix this test
	// it("should be able to retext english", () => {
	// 	const options = split(data);

	// 	const lastOption = options[options.length - 1];

	// 	const text = lastOption.lyric.map(({ text }) => retext(text).toLowerCase());
	// 	const expectedText = [
	// 		"Are you seriously thinking about pursuing a career as a race car driver?",
	// 		"Do you still need the light on, or can I turn it off?",
	// 		"We have a visitor right now. Would you mind waiting for a while?",
	// 		"How long does it take to get to Vienna on foot? he inquired.",
	// 		"It seems OK on paper, but I wonder if it's going to work.",
	// 		"Could you fill it up and take a look at the oil, too?",
	// 		"It is difficult to relate to someone who has different values from you.",
	// 		"I want you to write to me as soon as you get there.",
	// 		"There are some people who sleep in the daytime and work at night.",
	// 		"Give me something to write with. Will this do? Yes, it will do.",
	// 	].map((x) => x.toLowerCase());

	// 	expect(text).toMatchObject(expectedText);
	// });
});
