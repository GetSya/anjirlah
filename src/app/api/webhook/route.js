import { NextResponse } from 'next/server';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const URL = `https://api.telegram.org/bot${TOKEN}`;

// ===============================
// Helper kirim ke Telegram
// ===============================
async function sendToTelegram(method, body) {
  try {
    await fetch(`${URL}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Telegram API Error:', error);
  }
}

// ===============================
// Webhook handler
// ===============================
export async function POST(req) {
  try {
    const update = await req.json();
    const message = update.message;

    // Abaikan update selain text message
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    // Parsing command
    const args = message.text.trim().split(/\s+/);
    const command = args[0].replace('/', '').toLowerCase();
    const payload = args.slice(1).join(' ');
    const chatId = message.chat.id;

    // ===============================
    // SWITCH COMMAND
    // ===============================
    switch (command) {

      // ===============================
      // START
      // ===============================
      case 'start':
        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text:
`Halo 👋
Pilih menu:
- igdl <url>
- tiktok <url>
- teks
- dokumen
- gambar
- video
- audio
- tombol
- tombol_gambar`
        });
        break;

      // ===============================
      // INSTAGRAM DOWNLOADER
      // ===============================
      case 'igdl':
        if (!payload) {
          await sendToTelegram('sendMessage', {
            chat_id: chatId,
            text:
`📸 *Instagram Downloader*

Gunakan:
\`igdl https://www.instagram.com/p/xxxxx/\``,
            parse_mode: 'Markdown'
          });
          break;
        }

        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text: '⏳ Mengambil media Instagram...'
        });

        try {
          const apiRes = await fetch(
            `https://api.baguss.xyz/api/download/instagram?url=${encodeURIComponent(payload)}`
          );
          const data = await apiRes.json();

          if (!data.status || !data.result?.url) {
            await sendToTelegram('sendMessage', {
              chat_id: chatId,
              text: '❌ Media tidak ditemukan atau akun private.'
            });
            break;
          }

          const urls = data.result.url;
          const meta = data.result.metadata || {};
          const caption = meta.caption
            ? `@${meta.username}\n\n${meta.caption}`
            : `@${meta.username || 'instagram'}`;

          // Carousel / banyak media
          if (urls.length > 1) {
            const mediaGroup = urls.slice(0, 10).map((u, i) => ({
              type: meta.isVideo ? 'video' : 'photo',
              media: u,
              caption: i === 0 ? caption : ''
            }));

            await sendToTelegram('sendMediaGroup', {
              chat_id: chatId,
              media: mediaGroup
            });
          } else {
            // Single media
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
            text: '⚠️ Terjadi kesalahan saat memproses Instagram.'
          });
        }
        break;

      // ===============================
      // TIKTOK DOWNLOADER
      // ===============================
      case 'tiktok':
        if (!payload) {
          await sendToTelegram('sendMessage', {
            chat_id: chatId,
            text:
`🎵 *TikTok Downloader*

Gunakan:
\`tiktok https://vm.tiktok.com/xxxx/\``,
            parse_mode: 'Markdown'
          });
          break;
        }

        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text: '⏳ Mengambil konten TikTok...'
        });

        try {
          const apiRes = await fetch(
            `https://api.baguss.xyz/api/download/tiktok?url=${encodeURIComponent(payload)}`
          );
          const data = await apiRes.json();

          if (!data.status || !data.result) {
            await sendToTelegram('sendMessage', {
              chat_id: chatId,
              text: '❌ Konten tidak ditemukan.'
            });
            break;
          }

          const res = data.result;
          const caption = res.description || 'Berhasil diunduh';

          // Slideshow
          if (res.slides && res.slides.length > 0) {
            const mediaPhotos = res.slides.slice(0, 10).map((s, i) => ({
              type: 'photo',
              media: s.url,
              caption: i === 0 ? caption : ''
            }));

            await sendToTelegram('sendMediaGroup', {
              chat_id: chatId,
              media: mediaPhotos
            });

            await sendToTelegram('sendMessage', {
              chat_id: chatId,
              text: '🎶 Ambil audio atau versi video:',
              reply_markup: {
                inline_keyboard: [[
                  { text: '🎵 Audio', url: res.audio_url },
                  { text: '📹 Video', url: res.video_nowm }
                ]]
              }
            });
          } else {
            await sendToTelegram('sendVideo', {
              chat_id: chatId,
              video: res.video_nowm,
              caption,
              reply_markup: {
                inline_keyboard: [[
                  { text: '🎵 Audio', url: res.audio_url }
                ]]
              }
            });
          }
        } catch (err) {
          console.error(err);
          await sendToTelegram('sendMessage', {
            chat_id: chatId,
            text: '⚠️ Terjadi kesalahan saat memproses TikTok.'
          });
        }
        break;

      // ===============================
      // DEMO COMMAND
      // ===============================
      case 'teks':
        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text: 'Ini balasan teks.'
        });
        break;

      case 'dokumen':
        await sendToTelegram('sendDocument', {
          chat_id: chatId,
          document: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          caption: 'Contoh dokumen'
        });
        break;

      case 'gambar':
        await sendToTelegram('sendPhoto', {
          chat_id: chatId,
          photo: 'https://picsum.photos/400/300',
          caption: 'Contoh gambar'
        });
        break;

      case 'video':
        await sendToTelegram('sendVideo', {
          chat_id: chatId,
          video: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          caption: 'Contoh video'
        });
        break;

      case 'audio':
        await sendToTelegram('sendAudio', {
          chat_id: chatId,
          audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          caption: 'Contoh audio'
        });
        break;

      case 'tombol':
        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text: 'Pilih tombol:',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Google', url: 'https://google.com' }],
              [{ text: 'Admin', callback_data: 'admin' }]
            ]
          }
        });
        break;

      case 'tombol_gambar':
        await sendToTelegram('sendPhoto', {
          chat_id: chatId,
          photo: 'https://picsum.photos/400/400',
          caption: 'Gambar + tombol',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Download', url: 'https://picsum.photos' }]
            ]
          }
        });
        break;

      // ===============================
      // DEFAULT
      // ===============================
      default:
        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text: `Perintah "${command}" tidak dikenali.`
        });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
