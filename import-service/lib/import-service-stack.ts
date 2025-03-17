import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import "dotenv/config";

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const bucketName = process.env.BUCKET_NAME || "my-aws-uploaded-bucket";

    const catalogItemsQueue = sqs.Queue.fromQueueArn(
      this,
      "CatalogItemsQueue",
      `arn:aws:sqs:${this.region}:${this.account}:catalogItemsQueue`
    );

    const importProductsFileLambda = new lambda.Function(
      this,
      "ImportProductsFileLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset("lambda"),
        environment: {
          BUCKET_NAME: bucketName,
        },
      }
    );

    importProductsFileLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
        resources: [
          `arn:aws:s3:::${bucketName}`,
          `arn:aws:s3:::${bucketName}/*`,
        ],
      })
    );

    const importFileParserLambda = new lambda.Function(
      this,
      "ImportFileParserLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "parser.handler",
        code: lambda.Code.fromAsset("lambda"),
        environment: {
          BUCKET_NAME: bucketName,
          AWS_REGION: this.region,
          AWS_ACCOUNT_ID: this.account,
        },
      }
    );

    importFileParserLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "s3:GetObject",
          "s3:ListBucket",
          "s3:CopyObject",
          "s3:DeleteObject",
        ],
        resources: [
          `arn:aws:s3:::${bucketName}`,
          `arn:aws:s3:::${bucketName}/uploaded/*`,
          `arn:aws:s3:::${bucketName}/parsed/*`,
        ],
      })
    );
    importFileParserLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["sqs:SendMessage"],
        resources: [catalogItemsQueue.queueArn],
      })
    );

    const importBucket = s3.Bucket.fromBucketName(
      this,
      "ImportBucket",
      bucketName
    );

    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParserLambda),
      { prefix: "uploaded/" }
    );

    const api = new apigateway.RestApi(this, "ImportApi", {
      restApiName: "Import Service",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    const importResource = api.root.addResource("import");
    importResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFileLambda)
    );
  }
}
