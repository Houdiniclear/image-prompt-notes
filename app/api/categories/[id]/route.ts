import { NextResponse } from "next/server";
import { deleteCategory } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const success = await deleteCategory(params.id);
  return NextResponse.json({ success });
}
