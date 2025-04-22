import fastify, { FastifyRequest, FastifyReply } from "fastify";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = fastify({
  logger: true,
});

const serviceUrls: Record<string, string> = {
  product: process.env.PRODUCT_SERVICE_URL || "",
  cart: process.env.CART_SERVICE_URL || "",
};

app.all("/*", async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const serviceName = request.url.split("/")[1];
    const recipientUrl = serviceUrls[serviceName];

    if (!recipientUrl) {
      return reply.status(502).send({ error: "Cannot process request" });
    }

    const path = request.url.split("/").slice(2).join("/");
    const targetUrl = `${recipientUrl}/${path}${
      request.url.includes("?")
        ? request.url.substring(request.url.indexOf("?"))
        : ""
    }`;

    const response = await axios({
      method: request.method,
      url: targetUrl,
      headers: {
        ...request.headers,
        host: new URL(recipientUrl).host,
      },
      data: request.body,
    });

    return reply
      .status(response.status)
      .headers(response.headers as any)
      .send(response.data);
  } catch (error: any) {
    if (error.response) {
      return reply.status(error.response.status).send(error.response.data);
    }

    app.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
});

const port = process.env.PORT || 3000;
const start = async () => {
  try {
    await app.listen({ port: Number(port), host: "0.0.0.0" });
    console.log(`Server is running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
