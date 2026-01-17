import cron from "node-cron";
import { getSolPriceUSD } from "../utils/helpers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const startLivePriceCron = () => {
  console.log("LivePrice Cron Started");

  cron.schedule("*/15 * * * *", async () => {
    try {
      const solPrice = await getSolPriceUSD();

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
    } catch (err) {
      console.error("LivePrice Cron Error:", err);
    }
  });
};
