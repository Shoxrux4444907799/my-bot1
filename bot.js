const { Telegraf, Markup } = require("telegraf");

// 🔐 BOT TOKEN VA ADMIN ID
const BOT_TOKEN = "7593846547:AAEUx_qUvHI5CDH-yrwA3_W-LAo1RcvrnTk";
const ADMIN_ID = "5884122134";

// 📢 Majburiy obuna kanallari
const CHANNELS = ["@pubgmobilefps120", "@dgjoni_yt"];

const bot = new Telegraf(BOT_TOKEN);
const userState = {};

// ✅ Obuna tekshirish
async function checkSubscription(ctx) {
    let userId = ctx.from.id;
    let notSubscribed = [];

    for (let channel of CHANNELS) {
        try {
            let chatMember = await ctx.telegram.getChatMember(channel, userId);
            if (!["member", "administrator", "creator"].includes(chatMember.status)) {
                notSubscribed.push(channel);
            }
        } catch (error) {
            notSubscribed.push(channel);
        }
    }
    return notSubscribed;
}

// ✅ Start bosilganda obuna tekshirish
bot.start(async (ctx) => {
    let notSubscribed = await checkSubscription(ctx);
    if (notSubscribed.length > 0) {
        return ctx.reply(
            "❌ Botdan foydalanish uchun quyidagi kanallarga obuna bo‘ling:\n\n" +
                notSubscribed.map(channel => `🔹 [${channel}](https://t.me/${channel.replace("@", "")})`).join("\n") +
                "\n\n✅ Obuna bo‘lgach, /start tugmasini bosing!",
            {
                parse_mode: "Markdown",
                disable_web_page_preview: true
            }
        );
    }
    showMainMenu(ctx);
});

// ✅ Asosiy menyu
function showMainMenu(ctx) {
    ctx.reply(
        "👋 Assalamu alaykum! Botimizga xush kelibsiz!",
        Markup.keyboard([
            ["📍 Lokatsiya", "📞 Bog‘lanish"],
            ["📚 Kurslar"]
        ]).resize()
    );
}

// ✅ Lokatsiya
bot.hears("📍 Lokatsiya", (ctx) => {
    ctx.reply("📍 *Manzil:* Chinoz tumani, Biznes Fabrika O‘quv Markazi", { parse_mode: "Markdown" });
    ctx.replyWithLocation(40.9952, 68.7665);
});

// ✅ Bog‘lanish
bot.hears("📞 Bog‘lanish", (ctx) => {
    ctx.reply("📞 Biz bilan bog‘lanish uchun: +998 97 882 09 20");
});

// ✅ Kurslar menyusi
bot.hears("📚 Kurslar", (ctx) => {
    ctx.reply(
        "📚 Kurslarimiz:\n\n" +
        "💻 *Kompyuter savodxonligi*\n🌐 *Web dasturlash*\n📊 *Buxgalteriya*\n\n⬇️ Kursni tanlang!",
        Markup.keyboard([
            ["💻 Kompyuter savodxonligi", "🌐 Web dasturlash"],
            ["📊 Buxgalteriya", "⬅️ Ortga"]
        ]).resize()
    );
});

// ✅ Kurslar haqida ma'lumot
const courses = {
    "💻 Kompyuter savodxonligi": "📌 Kompyuter va ofis dasturlaridan foydalanishni o‘rgatamiz.",
    "🌐 Web dasturlash": "📌 HTML, CSS, JavaScript va Node.js asoslari o‘rgatiladi.",
    "📊 Buxgalteriya": "📌 1C dasturi va moliyaviy hisob-kitob kursi."
};

bot.hears(Object.keys(courses), (ctx) => {
    let course = ctx.message.text;
    userState[ctx.from.id] = { course, messages: [] };

    ctx.reply(
        `${courses[course]}\n\n✅ Ro‘yxatdan o‘tish uchun tugmani bosing.`,
        Markup.inlineKeyboard([
            Markup.button.callback("✅ Ro‘yxatdan o‘tish", `register_${ctx.from.id}`)
        ])
    );
});

// ✅ Ro‘yxatdan o‘tish - Ism so‘rash
bot.action(/^register_/, async (ctx) => {
    let userId = ctx.match.input.split("_")[1];

    if (!userState[userId]) return ctx.answerCbQuery("⛔ Kurs tanlanmagan!", { show_alert: true });

    userState[userId].messages = [];
    let msg = await ctx.reply("📌 Iltimos, ismingizni kiriting:");
    userState[userId].messages.push(msg.message_id);
});

// ✅ Ism kiritish va telefon raqam so‘rash
bot.on("text", async (ctx) => {
    let userId = ctx.from.id;
    if (!userState[userId]) return;

    if (!userState[userId].name) {
        let name = ctx.message.text.trim();
        if (name.length < 3) {
            return ctx.reply("❌ Ism juda qisqa! Iltimos, to‘liq ismingizni kiriting:");
        }
        userState[userId].name = name;

        deleteMessages(ctx, userId);

        let msg = await ctx.reply(
            "📞 Telefon raqamingizni kiriting yoki tugmani bosing.",
            Markup.keyboard([
                Markup.button.contactRequest("📞 Telefon raqamni yuborish"),
                ["⬅️ Ortga"]
            ]).resize()
        );

        userState[userId].messages.push(msg.message_id);
        return;
    }

    let phone = ctx.message.text.trim();
    if (!/^\+?\d{9,15}$/.test(phone)) {
        return ctx.reply("❌ Noto‘g‘ri telefon raqam! Iltimos, to‘g‘ri raqam kiriting:");
    }

    userState[userId].phone = phone;
    sendUserInfo(ctx, userId);
});

// ✅ Telefon raqamni avtomatik olish
bot.on("contact", async (ctx) => {
    let userId = ctx.from.id;
    if (!userState[userId]) return;

    userState[userId].phone = ctx.message.contact.phone_number;
    sendUserInfo(ctx, userId);
});

// ✅ Foydalanuvchi ma'lumotlarini adminga yuborish
async function sendUserInfo(ctx, userId) {
    if (!userState[userId]) return;

    let userInfo = `📝 Yangi ro‘yxatdan o‘tish:\n\n👤 Ism: ${userState[userId].name}\n📞 Telefon: ${userState[userId].phone}\n📚 Kurs: ${userState[userId].course}`;

    await bot.telegram.sendMessage(ADMIN_ID, userInfo);

    deleteMessages(ctx, userId);
    await ctx.reply("✅ Siz muvaffaqiyatli ro‘yxatdan o‘tdingiz!");
    showMainMenu(ctx);

    delete userState[userId]; 
}

// ✅ Xabarlarni o‘chirish funksiyasi
async function deleteMessages(ctx, userId) {
    if (userState[userId]?.messages) {
        for (let msgId of userState[userId].messages) {
            try { await ctx.deleteMessage(msgId); } catch (e) {}
        }
    }
    userState[userId].messages = [];
}

// ✅ Botni ishga tushirish
bot.launch();

                                    
