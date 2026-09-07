import { NextResponse } from "next/server";
import { sendWhatsAppImage, sendWhatsAppText } from "@/lib/whatsapp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let phone = "";
  let message = "";
  let imageFile: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    phone = String(formData.get("phone") ?? "").trim();
    message = String(formData.get("message") ?? "").trim();
    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      imageFile = image;
    }
  } else {
    const body = await request.json().catch(() => ({}));
    phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    message = typeof body?.message === "string" ? body.message.trim() : "";
  }

  if (!phone || (!message && !imageFile)) {
    return NextResponse.json(
      { error: "phone wajib diisi dan pesan atau gambar harus ada" },
      { status: 400 },
    );
  }

  try {
    if (imageFile) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      await sendWhatsAppImage(phone, {
        buffer,
        mimeType: imageFile.type || null,
        fileName: imageFile.name || null,
        caption: message || null,
      });
    } else {
      await sendWhatsAppText(phone, message);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengirim pesan" },
      { status: 400 },
    );
  }
}
