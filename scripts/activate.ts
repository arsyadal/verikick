import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import axios from "axios";
import nacl from "tweetnacl";
import bs58 from "bs58";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CONFIG = {
  apiOrigin: "https://txline-dev.txodds.com",
  rpcUrl: "https://api.devnet.solana.com",
  programId: new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
  txlTokenMint: new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
};

// IDL Minimal untuk subscribe
const IDL = {
  version: "0.1.0",
  name: "txoracle",
  instructions: [
    {
      name: "subscribe",
      accounts: [
        { name: "user", isMut: true, isSigner: true },
        { name: "pricingMatrix", isMut: false, isSigner: false },
        { name: "tokenMint", isMut: false, isSigner: false },
        { name: "userTokenAccount", isMut: true, isSigner: false },
        { name: "tokenTreasuryVault", isMut: true, isSigner: false },
        { name: "tokenTreasuryPda", isMut: true, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "associatedTokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "serviceLevelId", type: "u32" },
        { name: "durationWeeks", type: "u32" },
      ],
    },
  ],
};

async function run() {
  if (!process.env.PRIVATE_KEY) {
    console.error("❌ ERROR: PRIVATE_KEY tidak ditemukan di .env.local");
    return;
  }

  const wallet = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY));
  const connection = new Connection(CONFIG.rpcUrl, "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: "confirmed" });
  const program = new anchor.Program(IDL as any, provider);

  console.log("🚀 Memulai proses aktivasi untuk wallet:", wallet.publicKey.toBase58());

  // Derive PDAs
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("token_treasury_v2")], CONFIG.programId);
  const tokenTreasuryVault = getAssociatedTokenAddressSync(CONFIG.txlTokenMint, tokenTreasuryPda, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], CONFIG.programId);
  const userTokenAccount = getAssociatedTokenAddressSync(CONFIG.txlTokenMint, wallet.publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

  try {
    console.log("1. Melakukan Subscribe on-chain (Service Level 1)...");
    const txSig = await program.methods
      .subscribe(1, 4) // Level 1 (World Cup Free), 4 Weeks
      .accounts({
        user: wallet.publicKey,
        pricingMatrix: pricingMatrixPda,
        tokenMint: CONFIG.txlTokenMint,
        userTokenAccount,
        tokenTreasuryVault,
        tokenTreasuryPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .rpc();

    console.log("✅ Transaksi Berhasil:", txSig);

    console.log("2. Mendapatkan Guest JWT...");
    const authRes = await axios.post(`${CONFIG.apiOrigin}/auth/guest/start`);
    const jwt = authRes.data.token;

    console.log("3. Menandatangani pesan aktivasi...");
    const messageString = `${txSig}::${jwt}`;
    const message = new TextEncoder().encode(messageString);
    const signatureBytes = nacl.sign.detached(message, wallet.secretKey);
    const walletSignature = Buffer.from(signatureBytes).toString("base64");

    console.log("4. Mengaktifkan API Token...");
    const activateRes = await axios.post(`${CONFIG.apiOrigin}/api/token/activate`, {
      txSig,
      walletSignature,
      leagues: [],
    }, {
      headers: { Authorization: `Bearer ${jwt}` }
    });

    const apiToken = activateRes.data.token || activateRes.data;
    console.log("\n🔥 BERHASIL! Salin token ini ke .env.local kamu:");
    console.log("TXLINE_JWT=" + jwt);
    console.log("TXLINE_API_TOKEN=" + apiToken);

  } catch (e: any) {
    console.error("❌ GAGAL:", e.message);
  }
}

run();
