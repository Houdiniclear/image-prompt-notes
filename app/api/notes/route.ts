import { NextResponse } from "next/server";
import { getNotes, createNote } from "@/lib/db";

export async function GET() {
  try {
    const notes = await getNotes();
    return NextResponse.json(notes);
  } catch (e: any) {
    console.error("GET notes error:", e);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    console.log("Creating note with data:", data);
    const note = await createNote(data);
    console.log("Created note:", note);
    return NextResponse.json(note);
  } catch (e: any) {
    console.error("POST notes error:", e);
    return NextResponse.json(
      { error: e.message || "创建笔记失败" },
      { status: 500 }
    );
  }
}
