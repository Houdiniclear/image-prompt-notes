import { NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/scraper";

export async function POST(req: Request) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });
  try {
    const result = await scrapeUrl(url);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
