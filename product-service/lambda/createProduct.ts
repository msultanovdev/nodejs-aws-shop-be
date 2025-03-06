import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const dynamoDB = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDB);

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE_NAME || "products";
const STOCKS_TABLE = process.env.STOCKS_TABLE_NAME || "stocks";

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

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Request:", event);

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Request body is missing" }),
      };
    }

    const body: ProductInput = JSON.parse(event.body);
    console.log("Parsed body:", body);
    
    const { title, description = "", price, count = 0 } = body;

    if (
      !title ||
      typeof title !== "string" ||
      !price ||
      typeof price !== "number" ||
      price < 0
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid product data" }),
      };
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

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Product created successfully",
        product: newProduct,
      }),
    };
  } catch (error) {
    console.error("Error creating product:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
