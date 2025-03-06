import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({
  region: "us-east-1",
});
const docClient = DynamoDBDocumentClient.from(client);

const getRandomStock = () => Math.floor(Math.random() * 100) + 1;
const getRandomPrice = () => Math.floor(Math.random() * 500) + 50;

const generateProducts = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    title: `Product ${i + 1}`,
    description: `Description ${i + 1}`,
    price: getRandomPrice(),
  }));
};

const populateDB = async () => {
  const products = generateProducts(10);

  for (const product of products) {
    const id = uuidv4();

    await docClient.send(
      new PutCommand({
        TableName: "products",
        Item: { id, ...product },
      })
    );

    await docClient.send(
      new PutCommand({
        TableName: "stocks",
        Item: { product_id: id, count: getRandomStock() },
      })
    );
  }
};

populateDB().then(() => console.log("Data inserted"));
