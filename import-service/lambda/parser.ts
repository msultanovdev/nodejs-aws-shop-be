import { S3Event } from "aws-lambda";
import { S3 } from "aws-sdk";
import * as csv from "csv-parser";

interface IProduct {
  name: string;
  price: number;
  description: string;
  count: number;
}

const s3 = new S3();
const BUCKET_NAME = process.env.BUCKET_NAME || "my-aws-uploaded-bucket";
const results: IProduct[] = [];

export const handler = async (event: S3Event) => {
  try {
    for (const record of event.Records) {
      const key = decodeURIComponent(record.s3.object.key);
      const parsedKey = key.replace("uploaded/", "parsed/");

      console.log(`Processing file: ${key}`);

      const s3Stream = s3
        .getObject({ Bucket: BUCKET_NAME, Key: key })
        .createReadStream();

      await new Promise((resolve, reject) => {
        s3Stream
          .pipe(csv())
          .on("data", (data: IProduct) => {
            results.push(data);
            console.log("Parsed record:", data);
          })
          .on("end", async () => {
            console.log(`Finished processing file: ${key}`);
            console.log(results);

            await s3
              .copyObject({
                Bucket: BUCKET_NAME,
                CopySource: `${BUCKET_NAME}/${key}`,
                Key: parsedKey,
              })
              .promise();
            await s3.deleteObject({ Bucket: BUCKET_NAME, Key: key }).promise();

            console.log(`File moved to: ${parsedKey}`);
            resolve(null);
          })
          .on("error", (error: any) => {
            console.error("Error parsing file:", error);
            reject(error);
          });
      });
    }
  } catch (error) {
    console.error("Error processing event:", error);
  }
};
