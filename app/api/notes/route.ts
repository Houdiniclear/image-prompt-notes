import { NextResponse } from "next/server";
import { getNotes, createNote } from "@/lib/db";

export async function GET() {
  const notes = await getNotes();
  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  const data = await req.json();
  const note = await createNote(data);
  return NextResponse.json(note);
}
