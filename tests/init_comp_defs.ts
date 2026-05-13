import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import * as os from "os";
import {
  getArciumProgram,
  getMXEAccAddress,
  getClusterAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getLookupTableAddress,
} from "@arcium-hq/client";

const CLUSTER_OFFSET = 456;

const idl = JSON.parse(fs.readFileSync("target/idl/shieldlend.json", "utf8"));
const kp = anchor.web3.Keypair.fromSecretKey(
  new Uint8Array(
    JSON.parse(fs.readFileSync(os.homedir() + "/.config/solana/id.json", "utf8"))
  )
);

const connection = new anchor.web3.Connection(
  "https://devnet.helius-rpc.com/?api-key=92aad4bf-71ef-41b1-ae22-0ee0067029a3",
  "confirmed"
);
const provider = new anchor.AnchorProvider(
  connection,
  new anchor.Wallet(kp),
  { commitment: "confirmed" }
);
anchor.setProvider(provider);

const program = new anchor.Program(idl as anchor.Idl, provider);
const arciumProgram = getArciumProgram(provider);

const ARCIUM_PROGRAM_ID = new anchor.web3.PublicKey(
  "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
);

function getCompDefAccount(programId: anchor.web3.PublicKey, name: string) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(
    Buffer.from(
      require("crypto").createHash("sha256").update(name).digest()
    ).readUInt32LE(0),
    0
  );
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("ComputationDefinitionAccount"), programId.toBytes(), buf],
    ARCIUM_PROGRAM_ID
  )[0];
}

async function initCompDef(name: string, methodName: string) {
  console.log(`\nInitializing ${name}...`);

  const mxeAccount = getMXEAccAddress(program.programId);
  const mxeData = await arciumProgram.account.mxeAccount.fetch(mxeAccount);
  const addressLookupTable = getLookupTableAddress(program.programId, mxeData.lutOffsetSlot);
  const compDefAccount = getCompDefAccount(program.programId, name);

  console.log("  Comp Def Account:", compDefAccount.toString());
  console.log("  MXE Account:     ", mxeAccount.toString());
  console.log("  LUT Address:     ", addressLookupTable.toString());

  try {
    const tx = await (program.methods as any)[methodName]()
      .accountsPartial({
        payer: kp.publicKey,
        mxeAccount,
        compDefAccount,
        addressLookupTable,
      })
      .rpc({ commitment: "confirmed", skipPreflight: true });

    console.log(`  ✓ ${name} initialized! TX:`, tx);
  } catch (e: any) {
    if (e.message?.includes("already in use") || e.message?.includes("already been processed")) {
      console.log(`  ⚠ ${name} already initialized, skipping.`);
    } else {
      console.error(`  ✗ ${name} failed:`, e.message);
      if (e.logs) console.log("  Logs:", e.logs);
    }
  }
}

(async () => {
  console.log("Program ID:", program.programId.toString());
  console.log("Payer:     ", kp.publicKey.toString());

  await initCompDef("check_liquidatable", "initCheckLiquidatableCompDef");
  await initCompDef("apply_interest",     "initApplyInterestCompDef");
  await initCompDef("validate_borrow",    "initValidateBorrowCompDef");

  console.log("\n✓ All comp defs initialized.");
})();