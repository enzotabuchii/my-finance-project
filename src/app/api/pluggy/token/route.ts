import { NextResponse } from "next/server";
import { pluggy } from "@/lib/sync";

export async function GET() {
  try {
    const client = pluggy();
    const data = await client.createConnectToken();
    return NextResponse.json({ accessToken: data.accessToken });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
