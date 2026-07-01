import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'IoT devices endpoint' });
}

export async function POST() {
  return NextResponse.json({ message: 'IoT devices endpoint' });
}