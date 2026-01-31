import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_URL = `https://api.telegram.org/bot${TOKEN}`;

async function sendToTelegram(method, body) {
  await fetch(`${TG_URL}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function POST(req) {
  try {
    const update = await req.json();

    /* ================= CALLBACK ================= */
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const data = cb.data;

      if (data.startsWith('buy_')) {
        const itemId = data.replace('buy_', '');

        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text:
`✅ Pesanan diterima

🆔 Item: ${itemId}
📞 Admin akan menghubungi kamu untuk proses selanjutnya.`
        });
      }

      return NextResponse.json({ ok: true });
    }

    /* ================= MESSAGE ================= */
    const message = update.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const args = text.split(' ');
    const command = args[0].toLowerCase();
    const payload = args.slice(1).join(' ');

    /* ================= AMBIL MASTER DATA ================= */
    const { data: master, error } = await supabase
      .from('master_data')
      .select('daftar_item')
      .single();

    if (error || !master) {
      await sendToTelegram('sendMessage', {
        chat_id: chatId,
        text: "❌ Data produk tidak tersedia."
      });
      return NextResponse.json({ ok: true });
    }

    const items = master.daftar_item || [];

    switch (command) {

      /* ===== START ===== */
      case '/start':
        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text:
`👋 Selamat datang di *Marketplace Digital*

Perintah:
/market → Menu
produk → Lihat produk
detail <id> → Detail produk`,
          parse_mode: "Markdown"
        });
      break;

      /* ===== MARKET ===== */
      case '/market':
        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text:
`🛒 *Marketplace Menu*

📦 produk
🔍 detail <id>`,
          parse_mode: "Markdown"
        });
      break;

      /* ===== LIST PRODUK ===== */
      case 'produk': {
        if (!items.length) {
          await sendToTelegram('sendMessage', {
            chat_id: chatId,
            text: "❌ Produk kosong."
          });
          break;
        }

        const list = items.map((i, idx) =>
`🆔 ${i.id}
📦 ${i.nama_barang}
💰 Rp${i.harga_jual}
📦 Stok: ${i.stok}
`).join('\n');

        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text:
`📦 *Daftar Produk*\n\n${list}\nGunakan:\ndetail <id>`,
          parse_mode: "Markdown"
        });
      }
      break;

      /* ===== DETAIL ===== */
      case 'detail': {
        if (!payload) {
          await sendToTelegram('sendMessage', {
            chat_id: chatId,
            text: "Gunakan:\ndetail <id>"
          });
          break;
        }

        const item = items.find(i => i.id === payload);

        if (!item) {
          await sendToTelegram('sendMessage', {
            chat_id: chatId,
            text: "❌ Produk tidak ditemukan."
          });
          break;
        }

        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text:
`📦 *${item.nama_barang}*

🆔 ${item.id}
🏷️ ${item.kategori}
📦 Stok: ${item.stok}
📏 Satuan: ${item.satuan}
💰 Harga: Rp${item.harga_jual}
🔖 Kode: ${item.kode_barang}`,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🛒 Beli", callback_data: `buy_${item.id}` }]
            ]
          }
        });
      }
      break;

      /* ===== DEFAULT ===== */
      default:
        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text: "❓ Perintah tidak dikenali.\nKetik /market"
        });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
