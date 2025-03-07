import { S3Event } from "aws-lambda";
import { S3 } from "aws-sdk";
import * as csv from "csv-parser";

const s3 = new S3();
const BUCKET_NAME = process.env.BUCKET_NAME || "my-aws-uploaded-bucket";

export const handler = async (event: S3Event) => {
  try {
    for (const record of event.Records) {
      const key = record.s3.object.key;

      console.log(`file: ${key}`);

      const s3Stream = s3
        .getObject({ Bucket: BUCKET_NAME, Key: key })
        .createReadStream();

      s3Stream
        .pipe(csv())
        .on("data", (data: any) => {
          console.log("Parsed record:", data);
        })
        .on("end", () => {
          console.log(`Finished processing file: ${key}`);
        })
        .on("error", (error: any) => {
          console.error("Error parsing file:", error);
        });
    }
  } catch (error) {
    console.error("Error processing event:", error);
  }
};
