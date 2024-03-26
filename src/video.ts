import Ffmpeg from "fluent-ffmpeg";
import { imageSize } from "image-size";
import type { ISizeCalculationResult } from "image-size/dist/types/interface";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	Observable,
	Subject,
	distinctUntilChanged,
	filter,
	finalize,
	forkJoin,
	from,
	map,
	switchMap,
} from "rxjs";
import {
	PSM,
	createScheduler,
	createWorker,
	type Rectangle,
	type Scheduler,
} from "tesseract.js";
import type { AudioData, FrameData } from "./interface";
import { Lyric } from "./lyric";

export function truncate(
	filePath: string,
	outputPath: string,
	options: AudioData,
): Observable<void> {
	return new Observable((observer) => {
		const lyric = new Lyric(options.lyric);
		lyric.generateFile(outputPath.replace(".mp3", ".lrc"));

		console.log("Truncating...");

		Ffmpeg(filePath)
			.setStartTime(options.startTime)
			.setDuration(options.duration)
			.on("error", (err) => {
				observer.error(err);
			})
			.on("end", (err) => {
				if (err) {
					observer.error(err);
				} else {
					lyric.update(outputPath);

					observer.next();
				}

				observer.complete();
			})
			.saveToFile(outputPath);
	});
}

export function parseVideo(filePath: string): Observable<FrameData[]> {
	const outputDirectory = `./dist/output-${Date.now()}`;

	return videoToImages(filePath, outputDirectory).pipe(
		switchMap(() => parseVideoFromImages(outputDirectory)),
	);
}

function videoToImages(
	filePath: string,
	outputDirectory: string,
): Observable<void> {
	const progress$ = new Subject<number>();

	console.log("Parsing...");

	const subscription = progress$
		.pipe(
			filter((progress) => !Number.isNaN(progress)),
			map((progress) => Math.round(progress)),
			distinctUntilChanged(),
		)
		.subscribe((progress) => {
			console.log(`Progress: ${progress}%`);
		});

	fs.mkdirSync(outputDirectory, { recursive: true });

	return new Observable((observer) => {
		Ffmpeg(filePath)
			.outputOptions("-vf", "fps=1")
			.output(`${outputDirectory}/%d.png`)
			.on("progress", (progress) => {
				progress$.next(progress.percent);
			})
			.on("end", () => {
				observer.next();

				subscription.unsubscribe();
			})
			.on("error", (err) => {
				observer.error(err);

				subscription.unsubscribe();
			})
			.run();
	});
}

function parseVideoFromImages(
	outputDirectory: string,
): Observable<FrameData[]> {
	return from(getScheduler()).pipe(
		switchMap((scheduler) => {
			let size: ISizeCalculationResult;

			return forkJoin(
				Array(countTotalTime(outputDirectory))
					.fill(0)
					.map((_, i) => {
						const imagePath = path.join(outputDirectory, `${i + 1}.png`);

						if (!size) {
							size = imageSize(imagePath);
						}

						let rectangle: Rectangle | undefined = undefined;

						if (size.width && size.height) {
							const top = size.height * 0.1;
							const height = size.height - top;
							rectangle = {
								top,
								left: 0,
								width: size.width,
								height: height,
							};
						}

						return scheduler
							.addJob("recognize", imagePath, {
								rectangle,
							})
							.then((result) => {
								return {
									imagePath,
									rawText: result.data.text,
									timestamp: i,
								};
							});
					}),
			).pipe(
				map((data) => data.sort((a, b) => a.timestamp - b.timestamp)),
				finalize(() => {
					scheduler.terminate();

					fs.rmSync(outputDirectory, { recursive: true });
				}),
			);
		}),
	);
}

async function getScheduler(): Promise<Scheduler> {
	const scheduler = createScheduler();

	for (let i = 0; i < os.cpus().length; i++) {
		const worker = await createWorker("eng");

		await worker.setParameters({
			tessedit_char_whitelist:
				"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?! ",
			preserve_interword_spaces: "1",
			tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
		});

		scheduler.addWorker(worker);
	}

	return scheduler;
}

function countTotalTime(outputDirectory: string): number {
	const files = fs.readdirSync(outputDirectory);

	return files.length;
}
