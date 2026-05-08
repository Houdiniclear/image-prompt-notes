import { NextResponse } from "next/server";
import { getCategories, createCategory } from "@/lib/db";

export async function GET() {
  const categories = await getCategories();
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const data = await req.json();
  const category = await createCategory(data);
  return NextResponse.json(category);
}
