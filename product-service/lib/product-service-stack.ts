import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const createProductTopic = new sns.Topic(this, "CreateProductTopic", {
      topicName: "createProductTopic",
    });

    createProductTopic.addSubscription(
      new subscriptions.EmailSubscription("mukhammadamin.sultanov@gmail.com", {
        filterPolicy: {
          price: sns.SubscriptionFilter.numericFilter({
            greaterThan: 100,
          }),
        },
      })
    );

    createProductTopic.addSubscription(
      new subscriptions.EmailSubscription("s.mukhammadamin@gmail.com", {
        filterPolicy: {
          price: sns.SubscriptionFilter.numericFilter({
            lessThanOrEqualTo: 100,
          }),
        },
      })
    );

    const catalogItemsQueue = new sqs.Queue(this, "CatalogItemsQueue", {
      queueName: "catalogItemsQueue",
      visibilityTimeout: cdk.Duration.seconds(30),
      retentionPeriod: cdk.Duration.days(14),
    });

    const catalogBatchProcess = new lambda.Function(
      this,
      "catalogBatchProcess",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "catalogBatchProcess.handler",
        code: lambda.Code.fromAsset("lambda"),
        functionName: "catalogBatchProcess",
        timeout: cdk.Duration.seconds(30),
        environment: {
          PRODUCTS_TABLE_NAME: "products",
          STOCKS_TABLE_NAME: "stocks",
          CREATE_PRODUCT_TOPIC_ARN: createProductTopic.topicArn,
        },
      }
    );

    catalogBatchProcess.addEventSource(
      new lambdaEventSources.SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    );

    catalogBatchProcess.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ["sns:Publish"],
        resources: [createProductTopic.topicArn],
      })
    );

    catalogBatchProcess.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
        ],
        resources: [
          `arn:aws:dynamodb:${this.region}:${this.account}:table/products`,
          `arn:aws:dynamodb:${this.region}:${this.account}:table/stocks`,
        ],
      })
    );

    const getProductsList = new lambda.Function(this, "getProductsList", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "getProductsList.handler",
      code: lambda.Code.fromAsset("lambda"),
      functionName: "getProductsList",
    });

    const api = new apigateway.RestApi(this, "ProductsApi", {
      restApiName: "Products Service API",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const productsResource = api.root.addResource("products");
    productsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsList)
    );

    const getProductById = new lambda.Function(this, "getProductsById", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "getProductsById.handler",
      code: lambda.Code.fromAsset("lambda"),
      functionName: "getProductsById",
    });

    const productByIdResource = productsResource.addResource("{productId}");
    productByIdResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductById)
    );

    const createProduct = new lambda.Function(this, "createProduct", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "createProduct.handler",
      code: lambda.Code.fromAsset("lambda"),
      functionName: "createProduct",
    });

    productsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createProduct)
    );
  }
}
