import { createMint } from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import * as fs from 'fs';

async function CreateMintTokens() {
    const provider = new anchor.AnchorProvider(process.env.ANCHOR_PROVIDER_URL);
    anchor.setProvider(provider);
    const user = provider.wallet;

    const addresses = [];
    let count = 0;

    while (count < 1000) {
        const mint = Keypair.generate();
        const mintAddress = mint.publicKey.toBase58();

        if (mintAddress.endsWith('MTSY')) {
            addresses.push({
                publicKey: mintAddress,
                secretKey: Array.from(mint.secretKey)
            });
            console.log(`Found address ${count + 1}/1000:`, mintAddress);
            count++;
        }
    }

    // Save to JSON file
    fs.writeFileSync(
        'msn.json',
        JSON.stringify(addresses, null, 2),
        'utf-8'
    );
    
    console.log("All addresses saved to msn.json");
}

CreateMintTokens().then(() => {
    console.log("Process completed successfully");
}).catch((error) => {
    console.error("Error:", error);
});