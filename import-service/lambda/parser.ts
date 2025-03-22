import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import * as csv from "csv-parser";

interface IProduct {
  name: string;
  price: number;
  description: string;
  count: number;
}

const s3 = new S3Client({});
const sqs = new SQSClient({});
const SQS_URL = process.env.SQS_URL;

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

      const messages: any[] = [];
      
      await new Promise<void>((resolve, reject) => {
        s3Stream
          .pipe(csv())
          .on("data", (data: IProduct) => {
            const product = {
              name: data.name,
              description: data.description,
              price: Number(data.price),
              count: Number(data.count),
            };

            messages.push({
              title: product.name,
              description: product.description,
              price: product.price,
              count: product.count,
            });
          })
          .on("end", resolve)
          .on("error", reject);
      });

      console.log(`Found ${messages.length} products to process`);

      const batchSize = 5;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const sendPromises = batch.map(message => {
          const sendMessageCommand = new SendMessageCommand({
            QueueUrl: SQS_URL,
            MessageBody: JSON.stringify(message),
          });
          return sqs.send(sendMessageCommand);
        });

        await Promise.all(sendPromises);
        console.log(`Sent batch ${i / batchSize + 1} of ${Math.ceil(messages.length / batchSize)}`);
      }

      console.log("All messages sent to SQS successfully");

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
    throw error;
  }
};
