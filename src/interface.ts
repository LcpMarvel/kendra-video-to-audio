export interface FrameData {
	imagePath: string;
	rawText: string;
	timestamp: number;
}

export interface TruncationOptions {
	startTime: number;
	duration: number;
	rawText?: string;
}

export interface LyricData {
	text: string;
	timestamp: number;
}

export interface AudioData extends TruncationOptions {
	lyric: LyricData[];
}
