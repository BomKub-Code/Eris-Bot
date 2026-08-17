const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// customId format: "cmd|<command>|<arg>" ยิงตรงเข้า commandRouter เดิม
// หรือ "flow|<name>|" เปิดขั้นตอนพิเศษ (เลือกเป้าหมาย/กรอกจำนวนเงิน) ดูต่อที่ features/interactionRouter.js
const CHANNEL_MENUS = {
    'ป่ามอนสเตอร์': {
        title: '🌲 เมนูป่ามอนสเตอร์',
        buttons: [
            { label: '📊 สุ่มสเตตัส', style: ButtonStyle.Secondary, customId: 'cmd|!status|' },
            { label: '⚔️ ออกล่า', style: ButtonStyle.Primary, customId: 'cmd|!hunt|' },
            { label: '🧪 ใช้ยาโพชั่น', style: ButtonStyle.Secondary, customId: 'cmd|!use|potion' },
            { label: '🥷 ปล้นคน', style: ButtonStyle.Danger, customId: 'flow|rob|' },
            { label: '🏦 เริ่มปล้นธนาคาร', style: ButtonStyle.Danger, customId: 'cmd|!heist|' },
            { label: '🤝 ร่วมปล้นธนาคาร', style: ButtonStyle.Success, customId: 'cmd|!join|' }
        ]
    },
    'ธนาคาร': {
        title: '🏦 เมนูธนาคาร',
        buttons: [
            { label: '💳 เช็คเงิน', style: ButtonStyle.Secondary, customId: 'cmd|!bal|' },
            { label: '🎉 รับเงินเดือน', style: ButtonStyle.Success, customId: 'cmd|!daily|' },
            { label: '🏆 อันดับเศรษฐี', style: ButtonStyle.Secondary, customId: 'cmd|!rich|' },
            { label: '🏦 ข้อมูลบัญชี', style: ButtonStyle.Secondary, customId: 'cmd|!bank|' },
            { label: '📥 ฝากทั้งหมด', style: ButtonStyle.Primary, customId: 'cmd|!dep|all' },
            { label: '📥 ฝากกำหนดเอง', style: ButtonStyle.Primary, customId: 'flow|dep|' },
            { label: '📤 ถอนทั้งหมด', style: ButtonStyle.Primary, customId: 'cmd|!with|all' },
            { label: '📤 ถอนกำหนดเอง', style: ButtonStyle.Primary, customId: 'flow|with|' },
            { label: '💸 โอนเงิน', style: ButtonStyle.Secondary, customId: 'flow|pay|' },
            { label: '⚖️ ประกันตัว', style: ButtonStyle.Danger, customId: 'cmd|!bail|' }
        ]
    },
    'ตลาดมืด': {
        title: '🛒 เมนูตลาดมืด',
        buttons: [
            { label: '🛒 ดูร้านค้า', style: ButtonStyle.Secondary, customId: 'cmd|!shop|' },
            { label: '🎒 กระเป๋าของฉัน', style: ButtonStyle.Secondary, customId: 'cmd|!inv|' },
            { label: '🛍️ ซื้อของ', style: ButtonStyle.Primary, customId: 'flow|buy|' },
            { label: '🔨 ตีบวกอาวุธ', style: ButtonStyle.Primary, customId: 'flow|upgrade|' },
            { label: '🪙 ทายหัวก้อย', style: ButtonStyle.Success, customId: 'flow|cf|' },
            { label: '🎰 ตู้สล็อต', style: ButtonStyle.Success, customId: 'flow|slots|' }
        ]
    },
    'บอสโลก': {
        title: '🐉 เมนูบอสโลก',
        buttons: [
            { label: '👹 ดูข้อมูลบอส', style: ButtonStyle.Secondary, customId: 'cmd|!boss|' },
            { label: '⚔️ โจมตีบอส', style: ButtonStyle.Danger, customId: 'cmd|!attack|' }
        ]
    }
};

function buildRows(buttons) {
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        const row = new ActionRowBuilder();
        for (const btn of buttons.slice(i, i + 5)) {
            row.addComponents(
                new ButtonBuilder().setCustomId(btn.customId).setLabel(btn.label).setStyle(btn.style)
            );
        }
        rows.push(row);
    }
    return rows;
}

function findMenuKey(channelName) {
    if (!channelName) return undefined;
    return Object.keys(CHANNEL_MENUS).find(key => channelName.includes(key));
}

// คืน payload ({embeds, components}) พร้อมส่ง/แก้ไขข้อความได้ทันที ใช้ทั้งจาก !menu และระบบปักหมุดอัตโนมัติ
function buildMenuPayload(menuKey) {
    const menu = CHANNEL_MENUS[menuKey];
    if (!menu) return null;

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(menu.title)
        .setDescription('กดปุ่มด้านล่างเพื่อใช้คำสั่งได้เลย ไม่ต้องพิมพ์! (ปุ่มนี้ใช้ร่วมกันได้ทุกคนในห้อง)');

    return { embeds: [embed], components: buildRows(menu.buttons) };
}

// ==========================================
// 🕹️ เมนูปุ่มกดของแต่ละห้อง (!menu หรือ !เมนู)
// ==========================================
module.exports = {
    commands: ['!menu', '!เมนู'],
    findMenuKey,
    buildMenuPayload,
    execute(message) {
        const menuKey = findMenuKey(message.channel.name);

        if (!menuKey) {
            return message.reply('❌ ห้องนี้ยังไม่มีเมนูปุ่มให้ใช้งาน ลองไปที่ห้อง 🌲 ป่ามอนสเตอร์ / 🏦 ธนาคาร / 🛒 ตลาดมืด / 🐉 บอสโลก ครับ');
        }

        return message.reply(buildMenuPayload(menuKey));
    }
};
