import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({
  region: "us-east-1",
});
const docClient = DynamoDBDocumentClient.from(client);

const products = [
  { title: "Product 1", description: "Description 1", price: 100 },
  { title: "Product 2", description: "Description 2", price: 200 },
];

const stocks = [{ count: 10 }, { count: 5 }];

const populateDB = async () => {
  for (let i = 0; i < products.length; i++) {
    const id = uuidv4();

    await docClient.send(
      new PutCommand({
        TableName: "products",
        Item: { id, ...products[i] },
      })
    );

    await docClient.send(
      new PutCommand({
        TableName: "stocks",
        Item: { product_id: id, ...stocks[i] },
      })
    );
  }
};

populateDB().then(() => console.log("Data inserted"));
