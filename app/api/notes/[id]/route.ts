import { NextResponse } from "next/server";
import { getNote, updateNote, deleteNote } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const note = await getNote(params.id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(note);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json();
  const note = await updateNote(params.id, data);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(note);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const success = await deleteNote(params.id);
  return NextResponse.json({ success });
}
