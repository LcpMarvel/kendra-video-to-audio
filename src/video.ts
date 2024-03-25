import Ffmpeg from "fluent-ffmpeg";
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
	tap,
} from "rxjs";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createScheduler, createWorker } from "tesseract.js";
import type { FrameData, TruncationOptions } from "./interface";

export function truncate(
	filePath: string,
	outputPath: string,
	options: TruncationOptions,
): Observable<void> {
	return new Observable((observer) => {
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
	const scheduler = createScheduler();

	console.log("Parsing video...");

	return forkJoin(
		Array(os.cpus().length)
			.fill(0)
			.map(() => {
				return from(createWorker("eng")).pipe(
					tap((worker) => {
						scheduler.addWorker(worker);
					}),
				);
			}),
	).pipe(
		switchMap(() => {
			return forkJoin(
				Array(countTotalTime(outputDirectory))
					.fill(0)
					.map((_, i) => {
						const imagePath = path.join(outputDirectory, `${i + 1}.png`);

						return scheduler.addJob("recognize", imagePath).then((result) => {
							return {
								imagePath,
								text: result.data.text,
								timestamp: i,
							};
						});
					}),
			).pipe(map((data) => data.sort((a, b) => a.timestamp - b.timestamp)));
		}),
		finalize(() => {
			scheduler.terminate();

			fs.rmSync(outputDirectory, { recursive: true });
		}),
	);
}

function countTotalTime(outputDirectory: string): number {
	const files = fs.readdirSync(outputDirectory);

	return files.length;
}
