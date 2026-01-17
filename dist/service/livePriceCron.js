"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startLivePriceCron = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const helpers_1 = require("../utils/helpers");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const startLivePriceCron = () => {
    console.log("LivePrice Cron Started");
    node_cron_1.default.schedule("*/15 * * * *", async () => {
        try {
            const solPrice = await (0, helpers_1.getSolPriceUSD)();
            if (solPrice === 0) {
                console.warn("Skipping Prisma update: invalid SOL price");
                return;
            }
            const price = await prisma.liveSolPrice.upsert({
                where: { symbol: "SOL" },
                update: { price: solPrice },
                create: { symbol: "SOL", price: solPrice },
            });
            console.log("Updated 15-minute SOL price:", price.price);
        }
        catch (err) {
            console.error("LivePrice Cron Error:", err);
        }
    });
};
exports.startLivePriceCron = startLivePriceCron;
