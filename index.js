require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { loadDB, ensureUserData } = require('./features/db');
const { handleInteraction } = require('./features/interactionRouter');

const TOKEN = process.env.TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// แต่ละไฟล์ใน features/ คือฟีเจอร์ของบอท ที่ export { commands: [...], execute(message, args, command, db) }
const features = [
    require('./features/menu'),
    require('./features/status'),
    require('./features/bank'),
    require('./features/upgrade'),
    require('./features/items'),
    require('./features/hunt'),
    require('./features/casino'),
    require('./features/social'),
    require('./features/shop'),
    require('./features/leaderboard'),
    require('./features/boss'),
    require('./features/heist')
];

const commandRouter = new Map();
for (const feature of features) {
    for (const command of feature.commands) {
        commandRouter.set(command, feature);
    }
}

client.once('clientReady', () => {
    console.log(`บอท ${client.user.tag} พร้อมเปิดบ่อน แจกฟรุ้งฟริ้ง และเปิดศึกตีบอสแล้ว! 🎲✨⚔️`);
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!')) return;

    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();

    const feature = commandRouter.get(command);
    if (!feature) return;

    const db = loadDB();
    ensureUserData(db, message.author.id);

    feature.execute(message, args, command, db);
});

// ปุ่ม/select menu/modal จากเมนู !menu ทั้งหมดวิ่งผ่านตัวนี้ ยิงกลับเข้า commandRouter เดิม
client.on('interactionCreate', (interaction) => handleInteraction(interaction, commandRouter));

if (!TOKEN) {
    console.error("❌ ERROR: ไม่พบ TOKEN ใน environment variables (process.env.TOKEN)");
    console.error("👉 กรุณาตั้งค่า TOKEN ใน Dashboard ของ Discloud (หรือในไฟล์ .env)");
    process.exit(1);
}

client.login(TOKEN).catch(err => {
    console.error("❌ ไม่สามารถเข้าสู่ระบบ Discord ได้:", err.message);
});
