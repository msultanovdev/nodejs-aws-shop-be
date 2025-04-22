"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, fastify_1.default)({
    logger: true,
});
const serviceUrls = {
    product: process.env.PRODUCT_SERVICE_URL || "",
    cart: process.env.CART_SERVICE_URL || "",
};
app.all("/*", async (request, reply) => {
    try {
        const serviceName = request.url.split("/")[1];
        const recipientUrl = serviceUrls[serviceName];
        if (!recipientUrl) {
            return reply.status(502).send({ error: "Cannot process request" });
        }
        const path = request.url.split("/").slice(2).join("/");
        const targetUrl = `${recipientUrl}/${path}${request.url.includes("?")
            ? request.url.substring(request.url.indexOf("?"))
            : ""}`;
        const response = await (0, axios_1.default)({
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
            .headers(response.headers)
            .send(response.data);
    }
    catch (error) {
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
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};
start();
