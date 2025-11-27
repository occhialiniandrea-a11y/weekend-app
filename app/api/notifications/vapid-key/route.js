export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  
  if (!publicKey) {
    return Response.json(
      { error: 'VAPID public key non configurata' },
      { status: 500 }
    );
  }

  return Response.json({ publicKey });
}