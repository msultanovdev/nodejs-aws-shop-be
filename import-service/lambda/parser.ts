import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import * as csv from "csv-parser";

interface IProduct {
  name: string;
  price: number;
  description: string;
  count: number;
}

const s3 = new S3Client({});

export const handler = async (event: any) => {
  try {
    for (const record of event.Records) {
      const bucketName = record.s3.bucket.name;
      const objectKey = decodeURIComponent(
        record.s3.object.key.replace(/\+/g, " ")
      );

      console.log(`Processing file: ${bucketName}/${objectKey}`);

      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      });

      const { Body } = await s3.send(getObjectCommand);
      const s3Stream = Body as NodeJS.ReadableStream;

      const result: IProduct[] = [];

      await new Promise<void>((resolve, reject) => {
        s3Stream
          .pipe(csv())
          .on("data", (data: IProduct) => {
            result.push({
              name: data.name,
              description: data.description,
              price: Number(data.price),
              count: Number(data.count),
            });
          })
          .on("end", resolve)
          .on("error", reject);
      });

      result.forEach((res) => {
        console.log("Parsed Record:", res);
      });

      console.log("CSV file processing completed.");

      const newKey = `parsed/${objectKey.split("/")[1]}`;

      const copyCommand = new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${objectKey}`,
        Key: newKey,
      });
      await s3.send(copyCommand);
      console.log(`File copied to parsed folder: ${bucketName}/${newKey}`);

      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      });
      await s3.send(deleteCommand);
      console.log(
        `File deleted from uploaded folder: ${bucketName}/${objectKey}`
      );
    }
  } catch (error) {
    console.error("Error handling S3 event:", error);
  }
};
