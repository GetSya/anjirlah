import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_URL = `https://api.telegram.org/bot${TOKEN}`;
const MASTER_ID = '6db91251-7426-491b-bc87-121556bc2f1b';

/* ================= TELEGRAM REQUEST ================= */
async function tg(method, body) {
  const response = await fetch(`${TG_URL}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
}

/* ================= FORMAT CURRENCY ================= */
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

/* ================= GET CATEGORY ICON ================= */
function getCategoryIcon(category) {
  const icons = {
    'elektronik': '🔌',
    'fashion': '👕',
    'makanan': '🍔',
    'minuman': '🥤',
    'kesehatan': '💊',
    'olahraga': '⚽',
    'buku': '📚',
    'mainan': '🧸',
    'rumah-tangga': '🏠',
    'kendaraan': '🚗',
    'default': '📦'
  };
  return icons[category.toLowerCase()] || icons.default;
}

/* ================= PAGINATION UTILS ================= */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function getPaginationKeyboard(page, totalPages) {
  const keyboard = [];
  if (totalPages > 1) {
    const navButtons = [];
    if (page > 1) navButtons.push({ text: '◀️ Sebelumnya', callback_data: `page_${page - 1}` });
    navButtons.push({ text: `📄 ${page}/${totalPages}`, callback_data: 'current_page' });
    if (page < totalPages) navButtons.push({ text: 'Selanjutnya ▶️', callback_data: `page_${page + 1}` });
    keyboard.push(navButtons);
  }
  return keyboard;
}

/* ================= MAIN MENU ================= */
async function showMainMenu(chatId, messageId = null) {
  const keyboard = [
    [
      { text: '🛍️ Lihat Produk', callback_data: 'browse_products_1' },
      { text: '🔍 Cari Produk', callback_data: 'search_product' }
    ],
    [
      { text: '🏷️ Kategori', callback_data: 'show_categories' },
      { text: '🎯 Produk Terlaris', callback_data: 'top_products' }
    ],
    [
      { text: '🛒 Keranjang (0)', callback_data: 'view_cart' },
      { text: '📦 Pesanan Saya', callback_data: 'my_orders' }
    ],
    [
      { text: 'ℹ️ Bantuan', callback_data: 'help' },
      { text: '⚙️ Pengaturan', callback_data: 'settings' }
    ]
  ];

  const message = {
    chat_id: chatId,
    text: `🎊 *Selamat Datang di Marketplace Digital* 🎊

✨ *Fitur Unggulan:*
• 🛍️ Belanja produk digital mudah
• 🔒 Transaksi aman & terpercaya
• ⚡ Pengiriman instan
• 🎁 Diskon spesial setiap hari

📱 *Pilih menu di bawah untuk mulai berbelanja:*`,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  };

  if (messageId) {
    message.message_id = messageId;
    return tg('editMessageText', message);
  }
  return tg('sendMessage', message);
}

/* ================= PRODUCTS LIST ================= */
async function showProductsList(chatId, messageId, page = 1, category = null) {
  const { data: master } = await supabase
    .from('master_data')
    .select('daftar_item')
    .eq('id', MASTER_ID)
    .single();

  let items = master?.daftar_item || [];
  
  // Filter by category if specified
  if (category && category !== 'all') {
    items = items.filter(item => item.kategori?.toLowerCase() === category.toLowerCase());
  }
  
  // Filter only available items
  items = items.filter(item => item.stok > 0);
  
  // Sort by popularity/stok
  items.sort((a, b) => b.stok - a.stok);
  
  const itemsPerPage = 4;
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIdx = (page - 1) * itemsPerPage;
  const paginatedItems = items.slice(startIdx, startIdx + itemsPerPage);

  if (paginatedItems.length === 0) {
    const message = {
      chat_id: chatId,
      message_id: messageId,
      text: '😔 *Tidak ada produk yang tersedia*',
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Kembali ke Menu', callback_data: 'main_menu' }]
        ]
      }
    };
    return tg('editMessageText', message);
  }

  const productsList = paginatedItems.map(item => 
    `${getCategoryIcon(item.kategori)} *${item.nama_barang}*
💰 ${formatCurrency(item.harga_jual)} • 📦 ${item.stok} stok
🆔 \`${item.id}\`
──────────────`
  ).join('\n\n');

  const keyboard = [];
  
  // Product buttons (2 per row)
  paginatedItems.forEach(item => {
    keyboard.push([
      { 
        text: `${getCategoryIcon(item.kategori)} ${item.nama_barang.substring(0, 15)}...`, 
        callback_data: `detail_${item.id}_page_${page}_cat_${category || 'all'}`
      }
    ]);
  });

  // Navigation buttons
  const navButtons = [];
  if (page > 1) navButtons.push({ text: '◀️', callback_data: `page_${page - 1}_cat_${category || 'all'}` });
  navButtons.push({ text: '🏠 Menu', callback_data: 'main_menu' });
  if (category) navButtons.push({ text: `📂 ${category}`, callback_data: `category_${category}` });
  navButtons.push({ text: '🔍 Cari', callback_data: 'search_product' });
  if (page < totalPages) navButtons.push({ text: '▶️', callback_data: `page_${page + 1}_cat_${category || 'all'}` });
  
  keyboard.push(navButtons);
  
  // Footer buttons
  keyboard.push([
    { text: '🛒 Keranjang (0)', callback_data: 'view_cart' },
    { text: '🔙 Kembali', callback_data: 'browse_products_1' }
  ]);

  const message = {
    chat_id: chatId,
    message_id: messageId,
    text: `🛍️ *DAFTAR PRODUK* ${category ? `• ${category.toUpperCase()}` : ''}

${productsList}

📄 Halaman ${page} dari ${totalPages} • Total: ${items.length} produk`,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  };

  return tg('editMessageText', message);
}

/* ================= PRODUCT DETAIL ================= */
async function showProductDetail(chatId, messageId, itemId, fromPage = 1, fromCategory = 'all') {
  const { data: master } = await supabase
    .from('master_data')
    .select('daftar_item')
    .eq('id', MASTER_ID)
    .single();

  const items = master?.daftar_item || [];
  const item = items.find(i => i.id === itemId);

  if (!item) {
    return tg('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: '❌ Produk tidak ditemukan.',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Kembali', callback_data: `browse_products_${fromPage}` }]
        ]
      }
    });
  }

  const availability = item.stok > 0 ? '🟢 TERSEDIA' : '🔴 HABIS';
  const ratingStars = '⭐⭐⭐⭐⭐';
  const soldCount = Math.floor(Math.random() * 100) + 50; // Mock data

  const message = {
    chat_id: chatId,
    message_id: messageId,
    text: `${getCategoryIcon(item.kategori)} *${item.nama_barang.toUpperCase()}*

📋 *Detail Produk:*
🆔 Kode: \`${item.kode_barang || item.id}\`
🏷️ Kategori: ${item.kategori}
📦 Satuan: ${item.satuan}
📊 Stok: ${item.stok} unit
${ratingStars} (${soldCount} terjual)

💰 *Harga:*
${formatCurrency(item.harga_jual)}

${availability}

📝 *Deskripsi:*
Produk berkualitas dengan garansi 100% kepuasan. Pengiriman instan setelah pembayaran.

🎁 *Bonus:* Voucher diskon 10% untuk pembelian berikutnya!`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        item.stok > 0 ? [
          { text: '🛒 Tambah ke Keranjang', callback_data: `add_cart_${item.id}` },
          { text: '💰 Beli Sekarang', callback_data: `buy_now_${item.id}` }
        ] : [{ text: '🔴 STOK HABIS', callback_data: 'stock_empty' }],
        [
          { text: '❤️ Simpan', callback_data: `save_${item.id}` },
          { text: '📢 Bagikan', callback_data: `share_${item.id}` },
          { text: '📞 Tanya Admin', callback_data: `ask_admin_${item.id}` }
        ],
        [
          { text: '◀️ Kembali ke Daftar', callback_data: `page_${fromPage}_cat_${fromCategory}` },
          { text: '🏠 Menu Utama', callback_data: 'main_menu' }
        ]
      ]
    }
  };

  return tg('editMessageText', message);
}

/* ================= PURCHASE CONFIRMATION ================= */
async function showPurchaseConfirmation(chatId, messageId, itemId) {
  const { data: master } = await supabase
    .from('master_data')
    .select('daftar_item')
    .eq('id', MASTER_ID)
    .single();

  const items = master?.daftar_item || [];
  const item = items.find(i => i.id === itemId);

  if (!item) {
    return tg('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: '❌ Produk tidak ditemukan.'
    });
  }

  const message = {
    chat_id: chatId,
    message_id: messageId,
    text: `🛒 *KONFIRMASI PEMBELIAN*

${getCategoryIcon(item.kategori)} *${item.nama_barang}*
${formatCurrency(item.harga_jual)} × 1 unit
────────────────
💰 *Total:* ${formatCurrency(item.harga_jual)}

📋 *Detail Pembelian:*
• Metode: Instant Delivery
• Estimasi: 1-5 menit
• Support: 24/7 Customer Service

⚠️ *Pastikan data sudah benar sebelum melanjutkan.*`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Konfirmasi & Bayar', callback_data: `confirm_pay_${item.id}` },
          { text: '✏️ Ubah Jumlah', callback_data: `change_qty_${item.id}` }
        ],
        [
          { text: '💳 Metode Bayar Lain', callback_data: `payment_methods_${item.id}` },
          { text: '❓ Bantuan', callback_data: `help_payment_${item.id}` }
        ],
        [
          { text: '🔙 Kembali', callback_data: `detail_${item.id}_page_1_cat_all` },
          { text: '🗑️ Batalkan', callback_data: 'cancel_purchase' }
        ]
      ]
    }
  };

  return tg('editMessageText', message);
}

/* ================= CATEGORIES MENU ================= */
async function showCategoriesMenu(chatId, messageId) {
  const { data: master } = await supabase
    .from('master_data')
    .select('daftar_item')
    .eq('id', MASTER_ID)
    .single();

  const items = master?.daftar_item || [];
  const categories = [...new Set(items.map(item => item.kategori).filter(Boolean))];
  
  const categoryButtons = categories.map(cat => 
    [{ text: `${getCategoryIcon(cat)} ${cat}`, callback_data: `category_${cat.toLowerCase()}` }]
  );

  const keyboard = [
    ...categoryButtons,
    [{ text: '🌟 Semua Kategori', callback_data: 'category_all' }],
    [
      { text: '◀️ Kembali', callback_data: 'main_menu' },
      { text: '🔍 Cari Produk', callback_data: 'search_product' }
    ]
  ];

  const message = {
    chat_id: chatId,
    message_id: messageId,
    text: `🏷️ *PILIH KATEGORI*

Pilih kategori produk yang ingin Anda lihat:

• 📊 Total kategori: ${categories.length}
• 🛍️ Total produk: ${items.length}
• ⭐ Rekomendasi: Produk terlaris setiap kategori

*Pilih kategori di bawah:*`,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  };

  return tg('editMessageText', message);
}

/* ================= HELP MENU ================= */
async function showHelpMenu(chatId, messageId) {
  const message = {
    chat_id: chatId,
    message_id: messageId,
    text: `❓ *PUSAT BANTUAN*

*Cara Berbelanja:*
1️⃣ Pilih menu "🛍️ Lihat Produk"
2️⃣ Pilih produk yang diinginkan
3️⃣ Klik "🛒 Beli Sekarang"
4️⃣ Konfirmasi pembayaran
5️⃣ Admin akan menghubungi Anda

*Fitur Utama:*
• 🛍️ Belanja produk digital
• 🔒 Transaksi aman
• ⚡ Pengiriman instan
• 🎁 Diskon & promo

*Kontak Admin:*
📧 admin@marketplace.com
📞 +62 812-3456-7890

*Jam Operasional:*
🕐 24/7 Non-Stop`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📋 Cara Order', callback_data: 'help_order' },
          { text: '💳 Cara Bayar', callback_data: 'help_payment' }
        ],
        [
          { text: '🚚 Pengiriman', callback_data: 'help_shipping' },
          { text: '🔄 Refund', callback_data: 'help_refund' }
        ],
        [
          { text: '📞 Hubungi Admin', callback_data: 'contact_admin' },
          { text: '💬 FAQ', callback_data: 'faq' }
        ],
        [
          { text: '🔙 Kembali', callback_data: 'main_menu' },
          { text: '🏠 Menu Utama', callback_data: 'main_menu' }
        ]
      ]
    }
  };

  return tg('editMessageText', message);
}

/* ================= ORDER SUCCESS ================= */
async function showOrderSuccess(chatId, messageId, itemId) {
  const { data: master } = await supabase
    .from('master_data')
    .select('daftar_item')
    .eq('id', MASTER_ID)
    .single();

  const items = master?.daftar_item || [];
  const item = items.find(i => i.id === itemId);
  const orderId = `ORD-${Date.now().toString().slice(-8)}`;

  const message = {
    chat_id: chatId,
    message_id: messageId,
    text: `🎉 *PEMBELIAN BERHASIL!* 🎉

✅ Pesanan Anda telah kami terima.

📋 *Detail Pesanan:*
🆔 Order ID: \`${orderId}\`
📦 Produk: ${item?.nama_barang || 'Produk Digital'}
💰 Total: ${item ? formatCurrency(item.harga_jual) : 'Rp0'}
📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}
⏰ Waktu: ${new Date().toLocaleTimeString('id-ID')}

📞 *Admin akan menghubungi Anda dalam 1-5 menit.*
Silakan siapkan bukti transfer jika diperlukan.

✨ *Terima kasih telah berbelanja!* ✨

💡 *Tips:*
• Simpan Order ID untuk konfirmasi
• Periksa email/telegram secara berkala
• Hubungi admin jika ada kendala`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📦 Lacak Pesanan', callback_data: `track_${orderId}` },
          { text: '💬 Chat Admin', callback_data: 'contact_admin_now' }
        ],
        [
          { text: '🛍️ Lanjut Belanja', callback_data: 'browse_products_1' },
          { text: '🏠 Menu Utama', callback_data: 'main_menu' }
        ],
        [
          { text: '📄 Invoice', callback_data: `invoice_${orderId}` },
          { text: '⭐ Beri Rating', callback_data: `rate_${itemId}` }
        ]
      ]
    }
  };

  return tg('editMessageText', message);
}

/* ================= MAIN WEBHOOK HANDLER ================= */
export async function POST(req) {
  try {
    const update = await req.json();
    console.log('Update received:', JSON.stringify(update, null, 2));

    /* =====================================================
       CALLBACK QUERY HANDLER (BUTTON CLICKS)
    ===================================================== */
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const msgId = cb.message.message_id;
      const data = cb.data;
      const username = cb.from.username || cb.from.first_name;

      console.log(`Callback from ${username}: ${data}`);

      // Always answer callback query first
      await tg('answerCallbackQuery', {
        callback_query_id: cb.id,
        text: 'Memuat...'
      });

      /* ===== MAIN MENU ===== */
      if (data === 'main_menu') {
        return showMainMenu(chatId, msgId);
      }

      /* ===== BROWSE PRODUCTS ===== */
      if (data.startsWith('browse_products_')) {
        const page = parseInt(data.replace('browse_products_', '')) || 1;
        return showProductsList(chatId, msgId, page);
      }

      /* ===== PAGINATION ===== */
      if (data.startsWith('page_')) {
        const match = data.match(/page_(\d+)(?:_cat_(\w+))?/);
        if (match) {
          const page = parseInt(match[1]);
          const category = match[2] || 'all';
          return showProductsList(chatId, msgId, page, category);
        }
      }

      /* ===== PRODUCT DETAIL ===== */
      if (data.startsWith('detail_')) {
        const match = data.match(/detail_([^_]+)_page_(\d+)_cat_(\w+)/);
        if (match) {
          const [_, itemId, fromPage, fromCategory] = match;
          return showProductDetail(chatId, msgId, itemId, parseInt(fromPage), fromCategory);
        }
      }

      /* ===== BUY NOW ===== */
      if (data.startsWith('buy_now_')) {
        const itemId = data.replace('buy_now_', '');
        return showPurchaseConfirmation(chatId, msgId, itemId);
      }

      /* ===== CONFIRM PAYMENT ===== */
      if (data.startsWith('confirm_pay_')) {
        const itemId = data.replace('confirm_pay_', '');
        
        // Check stock availability
        const { data: master } = await supabase
          .from('master_data')
          .select('daftar_item')
          .eq('id', MASTER_ID)
          .single();
        
        const items = master?.daftar_item || [];
        const item = items.find(i => i.id === itemId);
        
        if (!item || item.stok <= 0) {
          await tg('editMessageText', {
            chat_id: chatId,
            message_id: msgId,
            text: '❌ *Maaf, stok produk telah habis.*\n\nSilakan pilih produk lain atau hubungi admin untuk pre-order.',
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🛍️ Lihat Produk Lain', callback_data: 'browse_products_1' }],
                [{ text: '📞 Hubungi Admin', callback_data: 'contact_admin' }]
              ]
            }
          });
          return NextResponse.json({ ok: true });
        }
        
        // Show order success
        return showOrderSuccess(chatId, msgId, itemId);
      }

      /* ===== CATEGORIES ===== */
      if (data.startsWith('category_')) {
        const category = data.replace('category_', '');
        if (category === 'all') {
          return showProductsList(chatId, msgId, 1);
        }
        return showProductsList(chatId, msgId, 1, category);
      }

      /* ===== SHOW CATEGORIES MENU ===== */
      if (data === 'show_categories') {
        return showCategoriesMenu(chatId, msgId);
      }

      /* ===== HELP MENU ===== */
      if (data === 'help') {
        return showHelpMenu(chatId, msgId);
      }

      /* ===== CANCEL PURCHASE ===== */
      if (data === 'cancel_purchase') {
        await tg('editMessageText', {
          chat_id: chatId,
          message_id: msgId,
          text: '❌ *Pembelian dibatalkan*\n\nPembelian telah dibatalkan. Anda bisa melanjutkan belanja kapan saja.',
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛍️ Lanjut Belanja', callback_data: 'browse_products_1' }],
              [{ text: '🏠 Menu Utama', callback_data: 'main_menu' }]
            ]
          }
        });
        return NextResponse.json({ ok: true });
      }

      /* ===== SEARCH PRODUCT ===== */
      if (data === 'search_product') {
        await tg('editMessageText', {
          chat_id: chatId,
          message_id: msgId,
          text: '🔍 *PENCARIAN PRODUK*\n\nKetik kata kunci produk yang ingin Anda cari:\n\nContoh: `laptop`, `baju`, `makanan`',
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Kembali', callback_data: 'main_menu' }]
            ]
          }
        });
        return NextResponse.json({ ok: true });
      }

      /* ===== TOP PRODUCTS ===== */
      if (data === 'top_products') {
        // Implement top products logic
        await tg('editMessageText', {
          chat_id: chatId,
          message_id: msgId,
          text: '🎯 *PRODUK TERLARIS*\n\nFitur ini sedang dalam pengembangan. 🚧',
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Kembali', callback_data: 'main_menu' }]
            ]
          }
        });
        return NextResponse.json({ ok: true });
      }

      /* ===== VIEW CART ===== */
      if (data === 'view_cart') {
        await tg('editMessageText', {
          chat_id: chatId,
          message_id: msgId,
          text: '🛒 *KERANJANG BELANJA*\n\nKeranjang Anda masih kosong.\n\nMulai belanja sekarang! 🛍️',
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛍️ Lihat Produk', callback_data: 'browse_products_1' }],
              [{ text: '🔙 Kembali', callback_data: 'main_menu' }]
            ]
          }
        });
        return NextResponse.json({ ok: true });
      }

      // Handle other callback queries
      await tg('editMessageText', {
        chat_id: chatId,
        message_id: msgId,
        text: '⚠️ Fitur ini sedang dalam pengembangan.',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Kembali ke Menu', callback_data: 'main_menu' }]
          ]
        }
      });

      return NextResponse.json({ ok: true });
    }

    /* =====================================================
       MESSAGE HANDLER (TEXT COMMANDS)
    ===================================================== */
    const message = update.message;
    if (!message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const args = text.split(' ');
    const command = args[0].toLowerCase();
    const payload = args.slice(1).join(' ');

    /* ===== WELCOME MESSAGE ===== */
    if (command === '/start') {
      const welcomeMessage = {
        chat_id: chatId,
        text: `👋 *Halo, ${message.from.first_name}!* Selamat datang di Marketplace Digital terpercaya! 🎉\n\nKami menyediakan berbagai produk digital dengan kualitas terbaik. Mulai belanja sekarang!`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Mulai Belanja', callback_data: 'browse_products_1' }],
            [
              { text: '📋 Panduan', callback_data: 'help' },
              { text: '🏷️ Kategori', callback_data: 'show_categories' }
            ]
          ]
        }
      };
      await tg('sendMessage', welcomeMessage);
      return NextResponse.json({ ok: true });
    }

    /* ===== MARKET COMMAND ===== */
    if (command === '/market') {
      return showMainMenu(chatId);
    }

    /* ===== PRODUCTS COMMAND ===== */
    if (command === 'produk') {
      await showProductsList(chatId, null, 1);
      return NextResponse.json({ ok: true });
    }

    /* ===== DETAIL COMMAND ===== */
    if (command === 'detail' && payload) {
      await showProductDetail(chatId, null, payload, 1, 'all');
      return NextResponse.json({ ok: true });
    }

    /* ===== SEARCH COMMAND ===== */
    if (command === 'cari' && payload) {
      // Implement search functionality
      await tg('sendMessage', {
        chat_id: chatId,
        text: `🔍 *Hasil pencarian untuk: "${payload}"*\n\nFitur pencarian sedang dalam pengembangan. 🚧`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛍️ Lihat Semua Produk', callback_data: 'browse_products_1' }]
          ]
        }
      });
      return NextResponse.json({ ok: true });
    }

    /* ===== HELP COMMAND ===== */
    if (command === 'help' || command === 'bantuan') {
      await showHelpMenu(chatId, null);
      return NextResponse.json({ ok: true });
    }

    /* ===== DEFAULT RESPONSE ===== */
    await tg('sendMessage', {
      chat_id: chatId,
      text: `🤖 *Marketplace Bot*\n\nPerintah yang tersedia:\n• /start - Memulai bot\n• /market - Menu utama\n• produk - Lihat produk\n• detail <id> - Detail produk\n• cari <kata kunci> - Cari produk\n• help - Bantuan\n\n*Atau gunakan tombol di bawah:*`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Buka Menu', callback_data: 'main_menu' }]
        ]
      }
    });

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
