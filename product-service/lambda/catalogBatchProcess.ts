import { SQSHandler, SQSEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { v4 as uuidv4 } from "uuid";

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE_NAME || "products";
const STOCKS_TABLE = process.env.STOCKS_TABLE_NAME || "stocks";
const CREATE_PRODUCT_TOPIC_ARN = process.env.CREATE_PRODUCT_TOPIC_ARN;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

interface ProductInput {
  title: string;
  description?: string;
  price: number;
  count?: number;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
}

export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  console.log("Received SQS event:", event);

  const dynamoDB = new DynamoDBClient({ region: AWS_REGION });
  const docClient = DynamoDBDocumentClient.from(dynamoDB);
  const sns = new SNSClient({ region: AWS_REGION });

  const failedRecords: any[] = [];

  try {
    for (const record of event.Records) {
      try {
        const body = JSON.parse(record.body);
        console.log("Processing record:", body);

        const { title, description = "", price, count = 0 } = body;

        if (
          !title ||
          typeof title !== "string" ||
          !price ||
          typeof price !== "number" ||
          price < 0
        ) {
          console.error("Invalid product data:", body);
          failedRecords.push({
            recordId: record.messageId,
            reason: "Invalid product data",
            data: body,
          });
          continue;
        }

        const productId = uuidv4();

        const newProduct: Product = {
          id: productId,
          title,
          description,
          price,
          count: count > 0 ? count : 0,
        };

        const transactCommand = new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: PRODUCTS_TABLE,
                Item: {
                  id: newProduct.id,
                  title: newProduct.title,
                  description: newProduct.description,
                  price: newProduct.price,
                },
              },
            },
            {
              Put: {
                TableName: STOCKS_TABLE,
                Item: {
                  product_id: newProduct.id,
                  count: newProduct.count,
                },
              },
            },
          ],
        });

        await docClient.send(transactCommand);
        console.log("Successfully created product:", newProduct);

        try {
          const publishCommand = new PublishCommand({
            TopicArn: CREATE_PRODUCT_TOPIC_ARN,
            Message: JSON.stringify({
              subject: "New Product Created",
              message: `Product "${newProduct.title}" has been created with ID: ${newProduct.id}`,
              product: newProduct,
            }),
            MessageAttributes: {
              price: {
                DataType: "Number",
                StringValue: newProduct.price.toString(),
              },
            },
          });

          await sns.send(publishCommand);
          console.log("Successfully sent SNS notification");
        } catch (error) {
          console.error("Error sending SNS notification:", error);
        }
      } catch (error: any) {
        console.error("Error processing record:", record.body, error);
        failedRecords.push({
          recordId: record.messageId,
          reason: "Processing error",
          error: error.message,
          data: record.body,
        });
      }
    }

    if (failedRecords.length > 0) {
      console.error("Failed to process records:", failedRecords);
      throw new Error(`Failed to process ${failedRecords.length} records`);
    }
  } catch (error) {
    console.error("Error processing catalog batch:", error);
    throw error;
  }
};
