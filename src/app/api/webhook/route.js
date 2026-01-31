import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_URL = `https://api.telegram.org/bot${TOKEN}`;
const MASTER_ID = '6db91251-7426-491b-bc87-121556bc2f1b';

/* ================= TELEGRAM REQUEST ================= */
async function tg(method, body) {
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

    /* =====================================================
       CALLBACK QUERY (BUTTON HANDLER)
    ===================================================== */
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const msgId = cb.message.message_id;
      const data = cb.data;

      /* ===== AMBIL ITEM ===== */
      const { data: master } = await supabase
        .from('master_data')
        .select('daftar_item')
        .eq('id', MASTER_ID)
        .single();

      const items = master?.daftar_item || [];

      /* ===== BUTTON: BELI ===== */
      if (data.startsWith('buy_')) {
        const itemId = data.replace('buy_', '');
        const item = items.find(i => i.id === itemId);

        if (!item) {
          await tg('editMessageText', {
            chat_id: chatId,
            message_id: msgId,
            text: '❌ Produk tidak ditemukan.'
          });
          return NextResponse.json({ ok: true });
        }

        await tg('editMessageText', {
          chat_id: chatId,
          message_id: msgId,
          text:
`🛒 *Konfirmasi Pembelian*

📦 *${item.nama_barang}*
💰 Rp${item.harga_jual}
📦 Stok: ${item.stok}

Apakah kamu yakin?`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Ya, Beli', callback_data: `confirm_${item.id}` },
                { text: '❌ Batal', callback_data: 'cancel' }
              ]
            ]
          }
        });

        return NextResponse.json({ ok: true });
      }

      /* ===== BUTTON: KONFIRMASI ===== */
      if (data.startsWith('confirm_')) {
        const itemId = data.replace('confirm_', '');
        const item = items.find(i => i.id === itemId);

        if (!item || item.stok <= 0) {
          await tg('editMessageText', {
            chat_id: chatId,
            message_id: msgId,
            text: '❌ Stok habis.'
          });
          return NextResponse.json({ ok: true });
        }

        await tg('editMessageText', {
          chat_id: chatId,
          message_id: msgId,
          text:
`✅ *Pesanan Berhasil*

📦 *${item.nama_barang}*
🆔 \`${item.id}\`

📞 Admin akan menghubungi kamu.`,
          parse_mode: 'Markdown'
        });

        return NextResponse.json({ ok: true });
      }

      /* ===== BUTTON: BATAL ===== */
      if (data === 'cancel') {
        await tg('editMessageText', {
          chat_id: chatId,
          message_id: msgId,
          text: '❌ Pembelian dibatalkan.'
        });

        return NextResponse.json({ ok: true });
      }
    }

    /* =====================================================
       MESSAGE HANDLER (COMMAND)
    ===================================================== */
    const message = update.message;
    if (!message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim().toLowerCase();
    const args = text.split(' ');
    const command = args[0];
    const payload = args.slice(1).join(' ');

    /* ===== AMBIL DATA ITEM ===== */
    const { data: master, error } = await supabase
      .from('master_data')
      .select('daftar_item')
      .eq('id', MASTER_ID)
      .single();

    if (error || !master) {
      await tg('sendMessage', {
        chat_id: chatId,
        text: '❌ Data produk tidak tersedia.'
      });
      return NextResponse.json({ ok: true });
    }

    const items = master.daftar_item || [];

    /* =====================================================
       COMMAND SWITCH
    ===================================================== */
    switch (command) {

      case '/start':
      case '/market':
        await tg('sendMessage', {
          chat_id: chatId,
          text:
`👋 *Marketplace Digital*

Perintah:
• produk → lihat produk
• detail <id> → detail produk`,
          parse_mode: 'Markdown'
        });
        break;

      case 'produk': {
        if (!items.length) {
          await tg('sendMessage', {
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

        await tg('sendMessage', {
          chat_id: chatId,
          text:
`📦 *Daftar Produk*

${list}
Gunakan:
detail <id>`,
          parse_mode: 'Markdown'
        });
        break;
      }

      case 'detail': {
        if (!payload) {
          await tg('sendMessage', {
            chat_id: chatId,
            text: 'Gunakan:\ndetail <id>'
          });
          break;
        }

        const item = items.find(i => i.id === payload);

        if (!item) {
          await tg('sendMessage', {
            chat_id: chatId,
            text: '❌ Produk tidak ditemukan.'
          });
          break;
        }

        await tg('sendMessage', {
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
        await tg('sendMessage', {
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
