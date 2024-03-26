import type { AudioData, FrameData, LyricData } from "./interface";

export function split(data: FrameData[], sentencesCount = 10): AudioData[] {
	const validItems = filterItems(data);

	// We want each audio has some sentences.
	const items: FrameData[] = [];
	const positions: number[] = [];

	for (let i = 0; i < validItems.length; i += sentencesCount) {
		const item = validItems[i];

		items.push(item);
		positions.push(i);
	}

	const lastItem = validItems[validItems.length - 1];
	if (items[items.length - 1].timestamp !== lastItem.timestamp) {
		items[items.length - 1] = lastItem;
		positions[positions.length - 1] = validItems.length - 1;
	}

	const options: AudioData[] = [];

	for (let i = 1; i < items.length; i++) {
		const item = items[i];
		const previousItem = items[i - 1];

		const lyric: LyricData[] = [];
		const beginning = validItems[positions[i - 1]].timestamp;

		for (let j = positions[i - 1]; j < positions[i]; j++) {
			const lyricItem = validItems[j];

			lyric.push({
				text: lyricItem.rawText,
				timestamp: lyricItem.timestamp - beginning,
			});
		}

		options.push({
			startTime: previousItem.timestamp,
			duration: item.timestamp - previousItem.timestamp,
			lyric,
		});
	}

	return options;
}

function filterItems(data: FrameData[]): FrameData[] {
	let skip = false;
	const validItems: FrameData[] = [];

	for (const item of data) {
		if (!skip && item.rawText.startsWith("Listen")) {
			skip = true;

			validItems.push(item);
		} else if (skip && !item.rawText.startsWith("Listen")) {
			skip = false;

			validItems[validItems.length - 1].rawText = item.rawText;
		}
	}

	if (
		data[data.length - 1].timestamp !==
		validItems[validItems.length - 1].timestamp
	) {
		validItems[validItems.length - 1] = data[data.length - 1];
	}

	return validItems;
}
