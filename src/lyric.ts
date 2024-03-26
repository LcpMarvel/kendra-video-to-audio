import NodeID3, { TagConstants } from "node-id3";
import type { LyricData } from "./interface";
import * as fs from "node:fs";

export class Lyric {
	lyric: LyricData[];

	constructor(lyric: LyricData[]) {
		this.lyric = lyric.map((item) => {
			item.text = retext(item.text);

			return item;
		});
	}

	update(filePath: string) {
		NodeID3.update(
			{
				synchronisedLyrics: [this.synchronisedLyric()],
			},
			filePath,
		);
	}

	generateFile(filePath: string) {
		const content = this.lyric
			.map((item) => {
				return `[${this.timestampText(item.timestamp * 1000)}] ${item.text}`;
			})
			.join("\n");

		fs.writeFileSync(filePath, content);
	}

	timestampText(value: number) {
		const milliseconds = value % 1000;
		const seconds = Math.floor(value / 1000) % 60;
		const minutes = Math.floor(value / 60000) % 60;

		const minutesString = String(minutes).padStart(2, "0");
		const secondsString = String(seconds).padStart(2, "0");
		const millisecondsString = String(milliseconds).padStart(3, "0");

		return `${minutesString}:${secondsString}.${millisecondsString}`;
	}

	unsynchronisedLyrics() {
		return {
			language: "eng",
			text: this.lyric.map((item) => item.text).join("\n"),
		};
	}

	synchronisedLyric() {
		return {
			language: "eng",
			timeStampFormat: TagConstants.TimeStampFormat.MILLISECONDS,
			contentType: TagConstants.SynchronisedLyrics.ContentType.LYRICS,
			shortText: "audio",
			synchronisedText: this.lyric.map((item) => ({
				text: item.text,
				timeStamp: item.timestamp * 1000,
			})),
		};
	}
}

export function retext(text: string) {
	if (!text) {
		return "";
	}

	return text
		.split("\n\n")[0]
		.replace(/\n.*\n$/, "")
		.replace(/\n/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}
