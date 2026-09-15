import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || "https://evolution.digital-alignment.com";
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || "3f91c0493c3f10458d59f094d4218d88d4a755a5e777bb846d44531cb65b35b4";
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "nipei-santuario";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const phoneNumber = url.searchParams.get("number");

    // 1. Check connection state
    const stateRes = await fetch(`${EVOLUTION_URL}/instance/connectionState/${INSTANCE_NAME}`, {
      headers: { apikey: EVOLUTION_KEY },
      cache: "no-store"
    });
    
    let stateData = null;
    if (stateRes.ok) {
      stateData = await stateRes.json();
    }

    const state = stateData?.instance?.state || "close";

    // If connected, return status
    if (state === "open") {
      return NextResponse.json({
        success: true,
        connected: true,
        instance: INSTANCE_NAME,
        state: "open",
        profile: stateData?.instance?.ownerJid || null
      });
    }

    // 2. Fetch QR Code or Pairing Code if phone number provided
    let cleanNum: string | null = null;
    let connectUrl = `${EVOLUTION_URL}/instance/connect/${INSTANCE_NAME}`;
    if (phoneNumber) {
      cleanNum = phoneNumber.replace(/\D/g, "");
      connectUrl += `?number=${cleanNum}`;
    }

    let connectRes = await fetch(connectUrl, {
      headers: { apikey: EVOLUTION_KEY },
      cache: "no-store"
    });

    let qrcodeData: any = null;
    if (connectRes.ok) {
      qrcodeData = await connectRes.json();
    }

    // Helper to parse pairing code
    const extractPairing = (data: any) => {
      let raw = data?.pairingCode || data?.qrcode?.pairingCode;
      if (raw && typeof raw === "string" && raw.length <= 14 && !raw.includes("@")) {
        return raw.trim();
      }
      return null;
    };

    let cleanPairingCode = extractPairing(qrcodeData);

    // If phone number was specified but pairingCode is null (stuck in QR mode), reset session and retry
    if (cleanNum && !cleanPairingCode) {
      try {
        await fetch(`${EVOLUTION_URL}/instance/logout/${INSTANCE_NAME}`, {
          method: "DELETE",
          headers: { apikey: EVOLUTION_KEY },
          cache: "no-store"
        });
        
        connectRes = await fetch(connectUrl, {
          headers: { apikey: EVOLUTION_KEY },
          cache: "no-store"
        });
        if (connectRes.ok) {
          qrcodeData = await connectRes.json();
          cleanPairingCode = extractPairing(qrcodeData);
        }
      } catch (err) {
        console.error("Error resetting WhatsApp session for pairing code:", err);
      }
    }

    return NextResponse.json({
      success: true,
      connected: false,
      instance: INSTANCE_NAME,
      state,
      qrcode: qrcodeData?.base64 || null,
      pairingCode: cleanPairingCode
    });
  } catch (err: any) {
    console.error("Error fetching WhatsApp QR/Pairing code:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to reach Evolution API" },
      { status: 500 }
    );
  }
}
