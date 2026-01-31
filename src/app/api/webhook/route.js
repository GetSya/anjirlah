import { NextResponse } from 'next/server';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const URL = `https://api.telegram.org/bot${TOKEN}`;

// ===============================
// Helper Telegram API
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
// Webhook Handler
// ===============================
function cleanInstagramUrl(url) {
  try {
    const u = new URL(url);
    const paths = u.pathname.split('/').filter(Boolean);

    // Ambil hanya sampai p / reel / tv
    if (['p', 'reel', 'tv'].includes(paths[0])) {
      return `${u.origin}/${paths[0]}/${paths[1]}/`;
    }

    return url;
  } catch {
    return url;
  }
}

export async function POST(req) {
  try {
    const update = await req.json();
    const message = update.message;

    // Abaikan selain pesan teks
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const text = message.text.trim();
    const chatId = message.chat.id;

    // Parsing command
    const args = text.split(/\s+/);
    let command = args[0].replace('/', '').toLowerCase();
    let payload = args.slice(1).join(' ');

    // ===============================
    // AUTO DETECT INSTAGRAM LINK
    // ===============================
    const isInstagramUrl =
      text.includes('instagram.com') ||
      text.includes('instagr.am');

    if (isInstagramUrl && !payload) {
      command = 'igdl';
      payload = text;
    }

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

Perintah tersedia:
- igdl <link Instagram>
- tiktok <link TikTok>

Kamu juga bisa langsung kirim link Instagram tanpa command.`
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
\`igdl https://www.instagram.com/p/xxxxx/\`

Atau langsung kirim link Instagram.`,
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
            `https://api-faa.my.id/faa/igdl?url=${encodeURIComponent(payload)}`
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

          // Banyak media (carousel)
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
\`tiktok https://vm.tiktok.com/xxxxx/\``,
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
              text: '🎶 Pilih versi:',
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
      // DEFAULT
      // ===============================
      default:
        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text: `Perintah tidak dikenali.\nKirim /start untuk bantuan.`
        });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
