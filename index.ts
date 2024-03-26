import { forkJoin, switchMap } from "rxjs";
import { split } from "./src/slicer";
import { parseVideo, truncate } from "./src/video";
import * as fs from "node:fs";
import * as path from "node:path";

const args = process.argv.slice(2);
const filePath = args[0];
const outputPath = path.resolve(args[1] || "/tmp");
const fileExtension = path.extname(filePath);
const fileName = path.basename(filePath, fileExtension);
const sentencesCount = args[2] ? Number.parseInt(args[2], 10) : 10;

if (!fs.existsSync(outputPath)) {
	throw new Error("The output path is invalid.");
}

parseVideo(filePath)
	.pipe(
		switchMap((data) => {
			return forkJoin(
				split(data, sentencesCount).map((option, index) => {
					return truncate(
						filePath,
						`${outputPath}/${fileName}-${index + 1}.mp3`,
						option,
					);
				}),
			);
		}),
	)
	.subscribe();
