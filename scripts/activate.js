const web3 = require("@solana/web3.js");
const { TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } = require("@solana/spl-token");
const axios = require("axios");
const nacl = require("tweetnacl");
const fs = require("fs");

require("dotenv").config({ path: ".env.local" });

const CONFIG = {
  apiOrigin: "https://txline-dev.txodds.com",
  rpcUrl: "https://api.devnet.solana.com",
  programId: new web3.PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
  txlTokenMint: new web3.PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
};

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function decodeB58(s) {
  let res = 0n;
  for (let c of s) res = res * 58n + BigInt(ALPHABET.indexOf(c));
  let hex = res.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  return Buffer.from(hex, "hex");
}

async function run() {
  const wallet = web3.Keypair.fromSecretKey(decodeB58(process.env.PRIVATE_KEY));
  const connection = new web3.Connection(CONFIG.rpcUrl, "confirmed");

  try {
    const authRes = await axios.post(`${CONFIG.apiOrigin}/auth/guest/start`);
    const jwt = authRes.data.token;

    const [tokenTreasuryPda] = web3.PublicKey.findProgramAddressSync([Buffer.from("token_treasury_v2")], CONFIG.programId);
    const tokenTreasuryVault = getAssociatedTokenAddressSync(CONFIG.txlTokenMint, tokenTreasuryPda, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
    const [pricingMatrixPda] = web3.PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], CONFIG.programId);
    const userTokenAccount = getAssociatedTokenAddressSync(CONFIG.txlTokenMint, wallet.publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

    const data = Buffer.alloc(11);
    data.set([254, 28, 191, 138, 156, 179, 183, 53], 0);
    data.writeUInt16LE(1, 8); 
    data.writeUInt8(4, 10);

    const instruction = new web3.TransactionInstruction({
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isMut: true },
        { pubkey: pricingMatrixPda, isSigner: false, isMut: false },
        { pubkey: CONFIG.txlTokenMint, isSigner: false, isMut: false },
        { pubkey: userTokenAccount, isSigner: false, isMut: true },
        { pubkey: tokenTreasuryVault, isSigner: false, isMut: true },
        { pubkey: tokenTreasuryPda, isSigner: false, isMut: true }, // Cobain Mut: True
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isMut: false },
        { pubkey: web3.SystemProgram.programId, isSigner: false, isMut: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isMut: false },
      ],
      programId: CONFIG.programId,
      data: data,
    });

    const tx = new web3.Transaction();
    const { createAssociatedTokenAccountInstruction } = require("@solana/spl-token");
    if (!(await connection.getAccountInfo(userTokenAccount))) {
      tx.add(createAssociatedTokenAccountInstruction(wallet.publicKey, userTokenAccount, wallet.publicKey, CONFIG.txlTokenMint, TOKEN_2022_PROGRAM_ID));
    }
    tx.add(instruction);
    const txSig = await web3.sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log("✅ Subscribe Berhasil:", txSig);

    const walletSignature = Buffer.from(nacl.sign.detached(new TextEncoder().encode(`${txSig}::${jwt}`), wallet.secretKey)).toString("base64");
    const activateRes = await axios.post(`${CONFIG.apiOrigin}/api/token/activate`, { txSig, walletSignature, leagues: [] }, { headers: { Authorization: `Bearer ${jwt}` } });
    const apiToken = activateRes.data.token || activateRes.data;
    
    fs.writeFileSync(".env.local", fs.readFileSync(".env.local", "utf8").split("\n").filter(l => !l.startsWith("TXLINE_")).join("\n") + `\nTXLINE_JWT=${jwt}\nTXLINE_API_TOKEN=${apiToken}\n`);
    console.log("\n🔥 BERHASIL!");

  } catch (e) {
    console.error("❌ ERROR:", e.response?.data || e.message);
    if (e.logs) console.log(e.logs);
  }
}
run();
