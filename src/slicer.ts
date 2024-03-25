import type { FrameData, TruncationOptions } from "./interface";

export function split(
	data: FrameData[],
	sentencesCount = 10,
): TruncationOptions[] {
	const validItems = filterItems(data);

	// We want each audio has some sentences.
	const items: FrameData[] = [];

	for (let i = 0; i < validItems.length; i += sentencesCount) {
		const item = validItems[i];

		items.push(item);
	}

	const lastItem = validItems[validItems.length - 1];
	if (items[items.length - 1].timestamp !== lastItem.timestamp) {
		items.push(lastItem);
	}

	const options: TruncationOptions[] = [];

	for (let i = 1; i < items.length; i++) {
		const item = items[i];
		const previousItem = items[i - 1];

		options.push({
			startTime: previousItem.timestamp,
			duration: item.timestamp - previousItem.timestamp,
		});
	}

	return options;
}

function filterItems(data: FrameData[]): FrameData[] {
	let skip = false;
	const validItems: FrameData[] = [];

	for (const item of data) {
		if (!skip && item.text.startsWith("Listen")) {
			skip = true;

			validItems.push(item);
		} else if (skip && !item.text.startsWith("Listen")) {
			skip = false;
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
