const fastify = require("fastify")();
const path = require("path");

fastify.register(require("@fastify/static"), {
    root: path.join(__dirname, "/public") 
});

(async () => {
    await fastify.listen({ port: 8080, host: "0.0.0.0" });
    console.log("Server listening to port 8080");
})();