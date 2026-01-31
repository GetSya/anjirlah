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
    const args = message.text.split(' ');
    const command = args[0].toLowerCase();
    const payload = args.slice(1).join(' ');

    if (!message || !message.text) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const userText = message.text.toLowerCase();

    // Menggunakan SWITCH CASE untuk memproses perintah
    switch (command) {
      case '/start':
        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text: "Halo! Pilih salah satu menu berikut:\n1. teks\n2. dokumen\n3. gambar\n4. video\n5. audio\n6. tombol\n7. tombol_gambar",
          reply_to_message_id: message.message_id // CONTOH REPLY PESAN
        });
        break;
        case 'igdl':
  if (!payload) {
    await sendToTelegram('sendMessage', {
      chat_id: chatId,
      text: "📸 *Instagram Downloader*\n\nGunakan format:\n`igdl https://www.instagram.com/p/xxxxx/`",
      parse_mode: "Markdown"
    });
    break;
  }

  await sendToTelegram('sendMessage', {
    chat_id: chatId,
    text: "⏳ Sedang mengambil media Instagram..."
  });

  try {
    const apiRes = await fetch(
      `https://api.baguss.xyz/api/download/instagram?url=${encodeURIComponent(payload)}`
    );
    const data = await apiRes.json();

    if (!data.status || !data.result || !data.result.url) {
      await sendToTelegram('sendMessage', {
        chat_id: chatId,
        text: "❌ Media tidak ditemukan atau private."
      });
      break;
    }

    const urls = data.result.url;
    const meta = data.result.metadata || {};
    const caption = meta.caption
      ? `@${meta.username}\n\n${meta.caption}`
      : `@${meta.username || "instagram"}`;

    // 🔹 JIKA MEDIA LEBIH DARI 1 (CAROUSEL)
    if (urls.length > 1) {
      const mediaGroup = urls.slice(0, 10).map((url, i) => ({
        type: meta.isVideo ? 'video' : 'photo',
        media: url,
        caption: i === 0 ? caption : ""
      }));

      await sendToTelegram('sendMediaGroup', {
        chat_id: chatId,
        media: mediaGroup
      });

    } else {
      // 🔹 SINGLE FOTO / VIDEO
      if (meta.isVideo) {
        await sendToTelegram('sendVideo', {
          chat_id: chatId,
          video: urls[0],
          caption
        });
      } else {
        await sendToTelegram('sendPhoto', {
          chat_id: chatId,
          photo: urls[0],
          caption
        });
      }
    }

  } catch (err) {
    console.error(err);
    await sendToTelegram('sendMessage', {
      chat_id: chatId,
      text: "⚠️ Terjadi kesalahan saat mengambil data Instagram."
    });
  }
  break;

        case 'tiktok':
        if (!payload) {
          await sendToTelegram('sendMessage', {
            chat_id: chatId,
            text: "Silakan masukkan link TikTok. Contoh:\n`/tiktok https://vm.tiktok.com/xxxx/`",
            parse_mode: "Markdown"
          });
          break;
        }

        await sendToTelegram('sendMessage', { chat_id: chatId, text: "Sedang memproses konten TikTok... ⏳" });

        try {
          const apiRes = await fetch(`https://api.baguss.xyz/api/download/tiktok?url=${encodeURIComponent(payload)}`);
          const data = await apiRes.json();

          if (data.status && data.result) {
            const res = data.result;
            const caption = res.description || "Berhasil diunduh!";

            // CEK APAKAH INI SLIDESHOW (Ada array slides)
            if (res.slides && res.slides.length > 0) {
              
              // 1. Kirim Foto sebagai Media Group (Album) - Max 10 Foto per album di Telegram
              const mediaPhotos = res.slides.slice(0, 10).map((slide, index) => ({
                type: 'photo',
                media: slide.url,
                caption: index === 0 ? caption : "" // Caption hanya muncul di foto pertama
              }));

              await sendToTelegram('sendMediaGroup', {
                chat_id: chatId,
                media: mediaPhotos
              });

              // 2. Kirim Pesan Tambahan dengan Tombol Musik (karena Slide punya lagu background)
              await sendToTelegram('sendMessage', {
                chat_id: chatId,
                text: "✨ Konten berupa slideshow foto.\nKlik tombol di bawah untuk ambil audio atau versi video render (jika ada):",
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: "🎵 Download Audio (MP3)", url: res.audio_url },
                      { text: "📹 Video Version", url: res.video_nowm }
                    ]
                  ]
                }
              });

            } else {
              // JIKA BUKAN SLIDESHOW (VIDEO BIASA)
              await sendToTelegram('sendVideo', {
                chat_id: chatId,
                video: res.video_nowm,
                caption: caption,
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: "📹 Download Video", url: res.video_nowm },
                      { text: "🎵 Download Audio", url: res.audio_url }
                    ]
                  ]
                }
              });
            }

          } else {
            await sendToTelegram('sendMessage', { chat_id: chatId, text: "Maaf, konten tidak ditemukan." });
          }
        } catch (error) {
          await sendToTelegram('sendMessage', { chat_id: chatId, text: "Terjadi kesalahan sistem API." });
        }
        break;

        case 'igdl':
           if (!payLoad){
            await sendToTelegram('sendMessage', {chat_id: chatId, text: "Tunggu sebentar yah kak sedang aku proses", parse_mode: Markdown});
           } 
            var datanya = await fetch(`https://api.baguss.xyz/api/download/instagram?url=${encodeURIComponent(payload)}`);
            await sendToTelegram('sendPhoto', {chat_id: chatId, photo: datanya.data[0].download, caption: "inih"})
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
