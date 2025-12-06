// import { Connection, PublicKey } from "@solana/web3.js";
// import { Server } from "socket.io";
// import { TokenInfo } from "../constants/types";

// import dotenv from "dotenv";
// import prismaService from "../service/prismaService";

// dotenv.config();

// const connection = new Connection(process.env.SOLANA_RPC!, "confirmed");

// const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

// export async function startSolanaListener(io: Server) {
//   console.log("🔎 Subscribing to Solana logs...");

//   connection.onLogs(TOKEN_PROGRAM_ID, async (logInfo) => {
//     const { logs, signature } = logInfo;

//     const logStr = logs.join(" | ");

//     if (logStr.includes("InitializeMint")) {
//       console.log("🎯 Detected token creation log");
      
//       const tokenData: TokenInfo = {
//         address: signature,
//         creator: "unknown",
//         name: "Token",
//         symbol: "TKN",
//         timestamp: Date.now()
//       };

//       // Create token using Prisma
//       await prismaService.createToken({
//         data: tokenData
//       });

//       io.to("new_tokens").emit("new_token", tokenData);
//     }
//   }, "confirmed");
// }
