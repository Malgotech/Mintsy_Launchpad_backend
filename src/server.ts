// src/server.ts
import http from "http";
import { initSocket } from "./utils/socket";
import app from "./index";
import dotenv from "dotenv";


dotenv.config();

const server = http.createServer(app);
initSocket(server);


server.listen(process.env.PORT || 4001, () => {
  console.log(`✅ Server running on http://localhost:4001`);
});
