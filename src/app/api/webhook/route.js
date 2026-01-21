import { NextResponse } from 'next/server';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const URL = `https://api.telegram.org/bot${TOKEN}`;

// Fungsi pembantu untuk mengirim request ke Telegram API
async function sendToTelegram(method, body) {
  try {
    await fetch(`${URL}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("Telegram API Error:", error);
  }
}

export async function POST(req) {
  try {
    const update = await req.json();
    const message = update.message;

    if (!message || !message.text) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const userText = message.text.toLowerCase();

    // Menggunakan SWITCH CASE untuk memproses perintah
    switch (userText) {
      case '/start':
        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text: "Halo! Pilih salah satu menu berikut:\n1. teks\n2. dokumen\n3. gambar\n4. video\n5. audio\n6. tombol\n7. tombol_gambar",
          reply_to_message_id: message.message_id // CONTOH REPLY PESAN
        });
        break;
        case '/tiktok':
        if (!payload) {
          await sendToTelegram('sendMessage', {
            chat_id: chatId,
            text: "Silakan masukkan link TikTok setelah perintah. Contoh:\n`/tiktok https://vm.tiktok.com/xxxx/`",
            parse_mode: "Markdown"
          });
          break;
        }

        await sendToTelegram('sendMessage', { chat_id: chatId, text: "Sabar ya, lagi diproses... ⏳" });

        try {
          const apiRes = await fetch(`https://api.baguss.xyz/api/download/tiktok?url=${encodeURIComponent(payload)}`);
          const data = await apiRes.json();

          if (data.status) {
            const res = data.result;
            
            // KIRIM VIDEO dengan caption dan TOMBOL (Button)
            await sendToTelegram('sendVideo', {
              chat_id: chatId,
              video: res.video_nowm,
              caption: res.description || "Video Berhasil Diunduh!",
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "📹 Download Video", url: res.video_nowm },
                    { text: "🎵 Download Audio", url: res.audio_url }
                  ]
                ]
              }
            });
          } else {
            await sendToTelegram('sendMessage', { chat_id: chatId, text: "Maaf, link TikTok tidak valid atau error." });
          }
        } catch (error) {
          await sendToTelegram('sendMessage', { chat_id: chatId, text: "Gagal menyambung ke server downloader." });
        }
        break;

      case 'teks':
        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text: "Ini adalah balasan pesan teks biasa."
        });
        break;

      case 'dokumen':
        await sendToTelegram('sendDocument', {
          chat_id: chatId,
          document: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", // Ganti URL dokumen
          caption: "Ini adalah pengiriman dokumen."
        });
        break;

      case 'gambar':
        await sendToTelegram('sendPhoto', {
          chat_id: chatId,
          photo: "https://picsum.photos/400/300", // Ganti URL gambar
          caption: "Ini adalah pengiriman gambar."
        });
        break;

      case 'video':
        await sendToTelegram('sendVideo', {
          chat_id: chatId,
          video: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", // Ganti URL video
          caption: "Ini adalah pengiriman video."
        });
        break;

      case 'audio':
        await sendToTelegram('sendAudio', {
          chat_id: chatId,
          audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", // Ganti URL audio
          caption: "Ini adalah pengiriman audio."
        });
        break;

      case 'tombol': // KIRIM BUTTON TEKS (INLINE KEYBOARD)
        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text: "Pilih menu tombol teks:",
          reply_markup: {
            inline_keyboard: [
              [{ text: "Website Kita", url: "https://google.com" }],
              [{ text: "Hubungi Admin", callback_data: "admin_contact" }]
            ]
          }
        });
        break;

      case 'tombol_gambar': // KIRIM GAMBAR DENGAN TOMBOL
        await sendToTelegram('sendPhoto', {
          chat_id: chatId,
          photo: "https://picsum.photos/400/400",
          caption: "Pilih aksi untuk gambar ini:",
          reply_markup: {
            inline_keyboard: [
              [{ text: "Download HD", url: "https://picsum.photos" }],
              [{ text: "Bagikan", switch_inline_query: "Cek gambar ini!" }]
            ]
          }
        });
        break;

      default:
        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text: `Perintah "${userText}" tidak dikenali. Ketik "halo" untuk menu.`
        });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error Processing Update:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}