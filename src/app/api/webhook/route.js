import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_URL = `https://api.telegram.org/bot${TOKEN}`;
const MASTER_ID = '6db91251-7426-491b-bc87-121556bc2f1b';

/* ================= TELEGRAM SENDER ================= */
async function sendToTelegram(method, body) {
  await fetch(`${TG_URL}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/* ================= WEBHOOK ================= */
export async function POST(req) {
  try {
    const update = await req.json();

    /* ========== CALLBACK QUERY ========== */
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const data = cb.data;

      if (data.startsWith('buy_')) {
        const itemId = data.replace('buy_', '');

        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text:
`✅ *Pesanan diterima*

🆔 Item: \`${itemId}\`
📞 Admin akan menghubungi kamu.`,
          parse_mode: 'Markdown'
        });
      }

      return NextResponse.json({ ok: true });
    }

    /* ========== MESSAGE ========== */
    const message = update.message;
    if (!message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const args = text.split(' ');
    const command = args[0].toLowerCase();
    const payload = args.slice(1).join(' ');

    /* ========== AMBIL DAFTAR ITEM ========== */
    const { data: master, error } = await supabase
      .from('master_data')
      .select('daftar_item')
      .eq('id', MASTER_ID)
      .single();

    if (error || !master) {
      await sendToTelegram('sendMessage', {
        chat_id: chatId,
        text: '❌ Data produk tidak tersedia.'
      });
      return NextResponse.json({ ok: true });
    }

    const items = master.daftar_item || [];

    /* ========== COMMAND HANDLER ========== */
    switch (command) {

      case '/start':
        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text:
`👋 *Selamat datang di Marketplace Digital*

Perintah:
• produk → lihat produk
• detail <id> → detail produk`,
          parse_mode: 'Markdown'
        });
        break;

      case '/market':
        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text:
`🛒 *Marketplace Menu*

• produk
• detail <id>`,
          parse_mode: 'Markdown'
        });
        break;

      case 'produk': {
        if (!items.length) {
          await sendToTelegram('sendMessage', {
            chat_id: chatId,
            text: '❌ Produk kosong.'
          });
          break;
        }

        const list = items.map(i =>
`📦 *${i.nama_barang}*
🆔 \`${i.id}\`
💰 Rp${i.harga_jual}
📦 Stok: ${i.stok}
`).join('\n');

        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text: `📦 *Daftar Produk*\n\n${list}\nGunakan:\ndetail <id>`,
          parse_mode: 'Markdown'
        });
        break;
      }

      case 'detail': {
        if (!payload) {
          await sendToTelegram('sendMessage', {
            chat_id: chatId,
            text: 'Gunakan:\ndetail <id>'
          });
          break;
        }

        const item = items.find(i => i.id === payload);

        if (!item) {
          await sendToTelegram('sendMessage', {
            chat_id: chatId,
            text: '❌ Produk tidak ditemukan.'
          });
          break;
        }

        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text:
`📦 *${item.nama_barang}*

🆔 \`${item.id}\`
🏷️ ${item.kategori}
📦 Stok: ${item.stok}
📏 ${item.satuan}
💰 Rp${item.harga_jual}
🔖 ${item.kode_barang}`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 Beli', callback_data: `buy_${item.id}` }]
            ]
          }
        });
        break;
      }

      default:
        await sendToTelegram('sendMessage', {
          chat_id: chatId,
          text: '❓ Perintah tidak dikenali\nKetik /market'
        });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
