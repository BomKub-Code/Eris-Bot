require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const TOKEN = process.env.TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// ไฟล์สำหรับเก็บข้อมูลบัญชีของกิลด์
const dbPath = './economy.json';

// 🏦 ระบบปล้นธนาคารรวม (Heist) - เก็บ session ชั่วคราวใน memory
const activeHeists = new Map(); // channelId -> { leaderId, members: Set, timeout, createdAt }

function loadDB() {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '{}');
    const data = JSON.parse(fs.readFileSync(dbPath));

    // ตัวแปรข้อมูลบอสโลกเริ่มต้น หากยังไม่มีใน DB
    if (!data['boss']) {
        data['boss'] = {
            name: '🔥 มังกรดำเพลิงอสูร (Ancient Black Dragon)',
            hp: 5000,
            maxHp: 5000,
            reward: 10000,
            damages: {}
        };
    }
    return data;
}

// 🛑 เพิ่มฟังก์ชัน saveDB ที่หายไปกลับเข้ามา
function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));
}

const WEAPONS_CONFIG = {
    sword: {
        id: 'sword',
        name: '⚔️ ดาบอัศวิน (`sword` หรือ `ดาบ`)',
        displayName: '⚔️ ดาบอัศวิน',
        aliases: ['sword', 'ดาบ', 'ดาบอัศวิน'],
        price: 3000,
        desc: '• เพิ่มโอกาสชนะออกล่าเป็น **65%**\n• ดาเมจบอส **+50 DMG**\n• ตีบวก: เงินออกล่า **+150**/ระดับ & ดาเมจบอส **+25 DMG**/ระดับ'
    },
    shield: {
        id: 'shield',
        name: '🛡️ โล่ศักดิ์สิทธิ์ (`shield` หรือ `โล่`)',
        displayName: '🛡️ โล่ศักดิ์สิทธิ์',
        aliases: ['shield', 'โล่', 'โล่ศักดิ์สิทธิ์'],
        price: 3500,
        desc: '• ลดเงินที่เสียจากการล่าล้มเหลว **30%**\n• มีโอกาสสะท้อนการปล้น (**25%**)\n• ตีบวก: ลดเงินที่เสีย **+5%**/ระดับ & สะท้อนการปล้น **+5%**/ระดับ'
    },
    bow: {
        id: 'bow',
        name: '🏹 ธนูเอลฟ์ (`bow` หรือ `ธนู`)',
        displayName: '🏹 ธนูเอลฟ์',
        aliases: ['bow', 'ธนู', 'ธนูเอลฟ์'],
        price: 4000,
        desc: '• โอกาส Critical ตีบอสเพิ่มเป็น **35%** (ปกติ 20%)\n• ตีบวก: เพิ่มความแรง Critical ตีบอส **+0.1x**/ระดับ (สูงสุด 2.5x)'
    },
    dagger: {
        id: 'dagger',
        name: '🗡️ มีดสั้นนักฆ่า (`dagger` หรือ `มีด`)',
        displayName: '🗡️ มีดสั้นนักฆ่า',
        aliases: ['dagger', 'มีด', 'มีดสั้น'],
        price: 4500,
        desc: '• เพิ่มโอกาสปล้น (`!rob`) สำเร็จเป็น **70%** (ปกติ 60%)\n• ตีบวก: เพิ่มเปอร์เซ็นต์เงินที่ปล้นได้ **+2%**/ระดับ'
    },
    staff: {
        id: 'staff',
        name: '🧙‍♂️ คทาเวทมนตร์ (`staff` หรือ `คทา`)',
        displayName: '🧙‍♂️ คทาเวทมนตร์',
        aliases: ['staff', 'คทา', 'คทาเวทมนตร์'],
        price: 5000,
        desc: '• พลังระเบิดบอสมหาศาล **+120 DMG**\n• ตีบวก: ดาเมจตีบอสเพิ่มขึ้น **+45 DMG**/ระดับ (สายระเบิดบอสแรงสุด!)'
    }
};

function ensureUserData(db, id) {
    if (!db[id]) {
        db[id] = {
            balance: 0,
            bank: 0,
            lastDaily: 0,
            lastHunt: 0,
            lastBossAttack: 0,
            lastRob: 0,
            inventory: {
                amulet: 0,
                potion: 0,
                ring: 0,
                weapons: {
                    sword: 0,
                    shield: 0,
                    bow: 0,
                    dagger: 0,
                    staff: 0
                }
            }
        };
    } else {
        if (db[id].bank === undefined) db[id].bank = 0;
        if (db[id].lastBossAttack === undefined) db[id].lastBossAttack = 0;
        if (db[id].lastRob === undefined) db[id].lastRob = 0;
        if (db[id].jailUntil === undefined) db[id].jailUntil = 0;
        if (db[id].lastHeist === undefined) db[id].lastHeist = 0;
        if (!db[id].inventory) db[id].inventory = {};
        if (db[id].inventory.amulet === undefined) db[id].inventory.amulet = 0;
        if (db[id].inventory.potion === undefined) db[id].inventory.potion = 0;
        if (db[id].inventory.ring === undefined) db[id].inventory.ring = 0;

        if (!db[id].inventory.weapons) {
            db[id].inventory.weapons = {
                sword: 0,
                shield: 0,
                bow: 0,
                dagger: 0,
                staff: 0
            };
            // ไมเกรทข้อมูลดาบเก่า
            if (db[id].inventory.sword && db[id].inventory.sword > 0) {
                const oldLvl = (db[id].inventory.swordLevel || 0) + 1;
                db[id].inventory.weapons.sword = oldLvl;
            }
        }
    }
}

function getWeaponLevel(db, id, type) {
    ensureUserData(db, id);
    const val = db[id].inventory?.weapons?.[type] || 0;
    return val > 0 ? val - 1 : -1;
}

function hasWeapon(db, id, type) {
    return getWeaponLevel(db, id, type) >= 0;
}

function findWeapon(query) {
    if (!query) return null;
    const q = query.toLowerCase();
    for (const key of Object.keys(WEAPONS_CONFIG)) {
        const w = WEAPONS_CONFIG[key];
        if (w.aliases.includes(q)) return w;
    }
    return null;
}

// 🔒 ระบบเช็คสถานะนักโทษ (Jail System)
function isInJail(db, userId) {
    const jailUntil = db[userId]?.jailUntil || 0;
    if (jailUntil <= Date.now()) return { inJail: false, minutesLeft: 0 };
    const minutesLeft = Math.ceil((jailUntil - Date.now()) / (60 * 1000));
    return { inJail: true, minutesLeft };
}

// 🏦 ฟังก์ชันดำเนินการปล้นธนาคาร
async function executeHeist(channel, session) {
    let db = loadDB();
    const members = Array.from(session.members);
    const memberCount = members.length;

    // โอกาสสำเร็จตามจำนวนคน: 2=5%, 3=8%, 4=12%, 5=15%
    const chances = { 2: 0.05, 3: 0.08, 4: 0.12, 5: 0.15 };
    const successChance = chances[memberCount] || 0.05;
    const isSuccess = Math.random() < successChance;

    // ตั้งคูลดาวน์ให้ทุกคน
    const timeNow = Date.now();
    for (const memberId of members) {
        ensureUserData(db, memberId);
        db[memberId].lastHeist = timeNow;
    }

    if (isSuccess) {
        // === ปล้นสำเร็จ! ดึงเงินทั้งหมดจากธนาคารทุกคน ===
        const stealPercent = 1; // 100%
        const memberSet = new Set(members);
        let totalStolen = 0;

        for (const [id, data] of Object.entries(db)) {
            if (id === 'boss' || memberSet.has(id)) continue;
            if (!data.bank || data.bank <= 0) continue;
            const stolen = Math.floor(data.bank * stealPercent);
            if (stolen <= 0) continue;
            db[id].bank -= stolen;
            totalStolen += stolen;
        }

        const share = Math.floor(totalStolen / memberCount);
        let memberList = '';
        for (const memberId of members) {
            db[memberId].balance += share;
            const name = session.memberNames[memberId] || memberId;
            memberList += `• ${name}: +**${share.toLocaleString()}** ฟรุ้งฟริ้ง\n`;
        }

        saveDB(db);

        const successEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('💰🎉 ปล้นธนาคารสำเร็จ!! 🎉💰')
            .setDescription(`🦹 แก๊งโจรของ **${session.leaderName}** บุกเข้าธนาคารกลางสำเร็จ!\n\n💵 ดึงเงิน **ทั้งหมด 100%** จากบัญชีธนาคารของทุกคนในเซิร์ฟเวอร์!\n💰 เงินที่ปล้นได้ทั้งหมด: **${totalStolen.toLocaleString()} ฟรุ้งฟริ้ง**`)
            .addFields(
                { name: '💸 ส่วนแบ่งของสมาชิก', value: memberList || 'ไม่มี' },
                { name: '📊 โอกาสที่สำเร็จ', value: `**${(successChance * 100).toFixed(0)}%** (${memberCount} คน)` }
            )
            .setFooter({ text: '⚠️ เหยื่อทุกคนสูญเสียเงินในธนาคารไปบางส่วน!' });

        channel.send({ embeds: [successEmbed] });
    } else {
        // === ปล้นล้มเหลว! จับเข้าคุกทุกคน ===
        const jailDuration = 2 * 60 * 60 * 1000; // 2 ชั่วโมง
        const jailUntil = Date.now() + jailDuration;

        let penaltyList = '';
        for (const memberId of members) {
            ensureUserData(db, memberId);
            const name = session.memberNames[memberId] || memberId;

            // 1. ติดคุก 2 ชั่วโมง
            db[memberId].jailUntil = jailUntil;

            // 2. ยึดเงินสด 100%
            const seizedCash = db[memberId].balance;
            db[memberId].balance = 0;

            // 3. 50% โอกาสริบอาวุธ
            let weaponPenalty = 'ไม่มี';
            const ownedWeapons = [];
            if (db[memberId].inventory?.weapons) {
                for (const key of Object.keys(WEAPONS_CONFIG)) {
                    const lvl = getWeaponLevel(db, memberId, key);
                    if (lvl >= 0) ownedWeapons.push(key);
                }
            }

            if (ownedWeapons.length > 0 && Math.random() < 0.5) {
                const targetWeapon = ownedWeapons[Math.floor(Math.random() * ownedWeapons.length)];
                const currentLvl = getWeaponLevel(db, memberId, targetWeapon);
                const wConfig = WEAPONS_CONFIG[targetWeapon];

                if (currentLvl <= 0) {
                    // อาวุธ +0 → พังหายไปเลย
                    db[memberId].inventory.weapons[targetWeapon] = 0;
                    weaponPenalty = `${wConfig.displayName} **พังหาย!** 💥`;
                } else {
                    // ลดระดับ -1
                    db[memberId].inventory.weapons[targetWeapon] -= 1;
                    weaponPenalty = `${wConfig.displayName} ลดเหลือ **+${currentLvl - 1}** 📉`;
                }
            }

            penaltyList += `**${name}:**\n> 💸 ยึดเงินสด: ${seizedCash.toLocaleString()} ฟรุ้งฟริ้ง\n> 🗡️ อาวุธ: ${weaponPenalty}\n\n`;
        }

        saveDB(db);

        const failEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('🚔 โดนจับ! ปล้นธนาคารล้มเหลว!')
            .setDescription(`🚨 ตำรวจสมาคมนักผจญภัยบุกจับแก๊งโจรของ **${session.leaderName}** ได้คาหนังคาเขา!\n\n⛓️ **สมาชิกทุกคนถูกจับเข้าคุก 2 ชั่วโมง!**\n💡 พิมพ์ \`!bail\` ที่ห้องธนาคารเพื่อจ่ายค่าประกันตัว`)
            .addFields(
                { name: '⚖️ บทลงโทษแต่ละคน', value: penaltyList || 'ไม่มี' },
                { name: '📊 โอกาสที่สำเร็จ', value: `**${(successChance * 100).toFixed(0)}%** (${memberCount} คน) — โชคไม่เข้าข้าง!` }
            )
            .setFooter({ text: '⏱️ ติดคุก 2 ชม. | พิมพ์ !bail ที่ห้องธนาคาร (ค่าปรับ 20% ของเงินในธนาคาร หรือ 15,000)' });

        channel.send({ embeds: [failEmbed] });
    }
}

// 🛑 แก้ ready เป็น clientReady ตามมาตรฐานใหม่
client.once('clientReady', () => {
    console.log(`บอท ${client.user.tag} พร้อมเปิดบ่อน แจกฟรุ้งฟริ้ง และเปิดศึกตีบอสแล้ว! 🎲✨⚔️`);
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    if (!message.content.startsWith('!')) return;

    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();

    let db = loadDB();
    const userId = message.author.id;

    ensureUserData(db, userId);

    // ==========================================
    // 📊 ระบบสุ่มสเตตัส (!status หรือ !สเตตัส)
    // ==========================================
    if (command === '!status' || command === '!สเตตัส') {
        if (!message.channel.name.includes('ป่ามอนสเตอร์')) {
            return message.reply('❌ กรุณาไปสุ่มสเตตัส ออกล่า และปล้นที่ห้อง **🌲-ป่ามอนสเตอร์** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const str = Math.floor(Math.random() * 100) + 1;
        const agi = Math.floor(Math.random() * 100) + 1;
        const int = Math.floor(Math.random() * 100) + 1;
        const luk = Math.floor(Math.random() * 100) + 1;

        const totalStat = str + agi + int + luk;
        let note = "";

        if (totalStat >= 360) note = "👑 พระเอกต่างโลกชัดๆ! บัคเกมแน่ๆ ไปตบจอมมารตั้งแต่วันแรกเลยไป!";
        else if (totalStat <= 100) note = "💀 สไลม์หน้าเมืองยังเก่งกว่าคุณ... แนะนำให้ไปโดนรถบรรทุกชนอีกรอบนะ";
        else if (luk >= 95) note = "✨ บุตรแห่งพระเจ้า! กาชาปองไม่เคยเกลือ เดินเตะฝุ่นก็เจอดาบศักดิ์สิทธิ์!";
        else if (luk <= 10) note = "😭 ดวงซวยระดับจักรวาล... ระวังเดินสะดุดยอดหญ้าตายนะ";
        else if (int >= 90 && str <= 30) note = "🧙‍♂️ มหาปราชญ์ผู้เปราะบาง... ร่ายเวทซะเท่ แต่โดนลมอ่อนๆ พัดก็ล้มแล้ว";
        else if (str >= 90 && int <= 30) note = "🦍 มีแต่กล้ามเนื้อไม่มีสมอง! เอาหัวโขกกำแพงแทนการเปิดประตูชัวร์";
        else if (agi >= 95) note = "⚡ ความเร็วแสง! วิ่งหนีมอนสเตอร์ (และวิ่งหนีหนี้) ไวที่สุดในปฐพี!";
        else if (str >= 85 && agi >= 85) note = "🥷 นักฆ่าเงามืด! พุ่งเข้าไปฟาดหน้าจอมมารแล้วจากไปอย่างรวดเร็ว";
        else if (str <= 20 && agi <= 20) note = "🐢 ช้าแถมอ่อนแอ... อาชีพที่เหมาะกับคุณคือ 'ก้อนหินประดับดันเจี้ยน'";
        else if (str === 69 || agi === 69 || int === 69 || luk === 69) note = "😏 เลข 69 สวยนะเราน่ะ... ดูทรงน่าจะถนัดวิชาแปลกๆ (ห๊ะ!)";
        else if (str >= 80) note = "💪 พี่กล้ามโต! แบกเพื่อนลงดันเจี้ยนได้สบายๆ";
        else if (int >= 80) note = "🧠 จอมเวทมันสมอง! หวังว่าตอนร่ายเวทจะไม่ลืมบทนะ";
        else if (agi >= 80) note = "🏃 สายพลิ้ว! หลบเก่งจนมอนสเตอร์หมั่นไส้";
        else if (luk >= 80) note = "🍀 คนดวงดี! ฝากกดสุ่มกาชาแทนเพื่อนหน่อยสิ";
        else if (luk <= 30) note = "🧂 กลิ่นความเกลือลอยมาแต่ไกล...";
        else note = "🧑‍🌾 ชาวบ้าน A ผู้ทรงเกียรติ... ไปทำฟาร์มปลูกผักชิลๆ ดีกว่านะ";

        const statusEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`📊 ใบประเมินสเตตัสของ ${message.author.username}`)
            .setDescription(`หลังจากโดนรถบรรทุกชน นี่คือพลังแฝงของคุณ!\n\n**บทสรุป:** ${note}`)
            .addFields(
                { name: '💪 พละกำลัง (STR)', value: `**${str}**/100`, inline: true },
                { name: '🏃 ความเร็ว (AGI)', value: `**${agi}**/100`, inline: true },
                { name: '🧠 เวทมนตร์ (INT)', value: `**${int}**/100`, inline: true },
                { name: '🍀 โชคชะตา (LUK)', value: `**${luk}**/100`, inline: true }
            )
            .setThumbnail(message.author.displayAvatarURL())
            .setFooter({ text: 'ออกใบรับรองโดย สมาคมนักผจญภัย' });

        return message.reply({ embeds: [statusEmbed] });
    }

    // ==========================================
    // 🪙 เช็คเงิน และ เงินเดือน (!bal, !money, !daily)
    // ==========================================
    if (command === '!bal' || command === '!money' || command === '!เงิน') {
        if (!message.channel.name.includes('ธนาคาร')) {
            return message.reply('❌ กรุณาไปทำธุรกรรมการเงินและดูอันดับที่ห้อง **🏦-ธนาคาร-และ-จัดอันดับ** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const cash = db[userId].balance || 0;
        const bank = db[userId].bank || 0;
        const total = cash + bank;

        const balEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(`💳 บัญชีทรัพย์สินของ ${message.author.username}`)
            .setDescription(`💵 **เงินสดติดตัว:** ${cash.toLocaleString()} ฟรุ้งฟริ้ง\n🏦 **เงินในธนาคาร:** ${bank.toLocaleString()} ฟรุ้งฟริ้ง\n✨ **ทรัพย์สินรวม:** ${total.toLocaleString()} ฟรุ้งฟริ้ง`)
            .setFooter({ text: 'ใช้คำสั่ง !ฝาก หรือ !ถอน เพื่อจัดการเงินในธนาคาร' });
        return message.reply({ embeds: [balEmbed] });
    }

    if (command === '!daily') {
        if (!message.channel.name.includes('ธนาคาร')) {
            return message.reply('❌ กรุณาไปทำธุรกรรมการเงินและดูอันดับที่ห้อง **🏦-ธนาคาร-และ-จัดอันดับ** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const jailStatus = isInJail(db, userId);
        if (jailStatus.inJail) return message.reply(`🔒 **อยู่ในคุกอย่ามาซ่า!** คุณเป็นนักโทษอยู่! รออีก **${jailStatus.minutesLeft} นาที** ถึงจะรับเงินเดือนได้ พิมพ์ \`!bail\` เพื่อประกันตัว`);

        const cooldown = 24 * 60 * 60 * 1000;
        const timeNow = Date.now();
        const lastDaily = db[userId].lastDaily;

        if (timeNow - lastDaily < cooldown) {
            const timeLeft = Math.floor((cooldown - (timeNow - lastDaily)) / (60 * 60 * 1000));
            return message.reply(`⏳ ใจเย็นวัยรุ่น! คุณรับเงินเดือนไปแล้ว ต้องรออีก **${timeLeft} ชั่วโมง** ถึงจะรับได้ใหม่`);
        }

        const baseDaily = 1500;
        const hasRing = (db[userId].inventory?.ring || 0) > 0;
        const bonus = hasRing ? Math.floor(baseDaily * 0.2) : 0;
        const totalDaily = baseDaily + bonus;

        db[userId].balance += totalDaily;
        db[userId].lastDaily = timeNow;
        saveDB(db);

        const ringMsg = hasRing ? ` *(+${bonus} จากโบนัสแหวนโชคลาภ 💍)*` : '';
        return message.reply(`🎉 รับเงินเดือนสำเร็จ! คุณได้รับ **${totalDaily.toLocaleString()} ฟรุ้งฟริ้ง** ✨${ringMsg} (เงินสดคงเหลือ: ${db[userId].balance.toLocaleString()})`);
    }

    // ==========================================
    // 🏦 ระบบธนาคาร (!dep, !with, !bank)
    // ==========================================
    if (command === '!dep' || command === '!deposit' || command === '!ฝาก') {
        if (!message.channel.name.includes('ธนาคาร')) {
            return message.reply('❌ กรุณาไปทำธุรกรรมการเงินและดูอันดับที่ห้อง **🏦-ธนาคาร-และ-จัดอันดับ** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const arg = args[0]?.toLowerCase();
        if (!arg) return message.reply('❌ วิธีใช้: `!ฝาก <จำนวนเงิน>` หรือ `!ฝาก all`');

        let amount = 0;
        if (arg === 'all' || arg === 'หมด') {
            amount = db[userId].balance;
        } else {
            amount = parseInt(arg);
        }

        if (isNaN(amount) || amount <= 0) return message.reply('❌ กรุณาระบุจำนวนเงินที่ถูกต้อง');
        if (db[userId].balance < amount) return message.reply('💸 คุณมีเงินสดติดตัวไม่พอฝาก!');

        db[userId].balance -= amount;
        db[userId].bank = (db[userId].bank || 0) + amount;
        saveDB(db);

        return message.reply(`🏦 **ฝากเงินสำเร็จ!** คุณได้ฝากเงิน **${amount.toLocaleString()} ฟรุ้งฟริ้ง** เข้าธนาคาร\n> 💵 เงินสดคงเหลือ: **${db[userId].balance.toLocaleString()}** | 🏦 เงินในธนาคาร: **${db[userId].bank.toLocaleString()}**`);
    }

    if (command === '!with' || command === '!withdraw' || command === '!ถอน') {
        if (!message.channel.name.includes('ธนาคาร')) {
            return message.reply('❌ กรุณาไปทำธุรกรรมการเงินและดูอันดับที่ห้อง **🏦-ธนาคาร-และ-จัดอันดับ** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const arg = args[0]?.toLowerCase();
        if (!arg) return message.reply('❌ วิธีใช้: `!ถอน <จำนวนเงิน>` หรือ `!ถอน all`');

        let amount = 0;
        if (arg === 'all' || arg === 'หมด') {
            amount = db[userId].bank || 0;
        } else {
            amount = parseInt(arg);
        }

        if (isNaN(amount) || amount <= 0) return message.reply('❌ กรุณาระบุจำนวนเงินที่ถูกต้อง');
        if ((db[userId].bank || 0) < amount) return message.reply('💸 เงินในธนาคารของคุณไม่พอถอน!');

        db[userId].bank -= amount;
        db[userId].balance += amount;
        saveDB(db);

        return message.reply(`🏧 **ถอนเงินสำเร็จ!** คุณได้ถอนเงิน **${amount.toLocaleString()} ฟรุ้งฟริ้ง** จากธนาคาร\n> 💵 เงินสดคงเหลือ: **${db[userId].balance.toLocaleString()}** | 🏦 เงินในธนาคาร: **${db[userId].bank.toLocaleString()}**`);
    }

    if (command === '!bank' || command === '!ธนาคาร') {
        if (!message.channel.name.includes('ธนาคาร')) {
            return message.reply('❌ กรุณาไปทำธุรกรรมการเงินและดูอันดับที่ห้อง **🏦-ธนาคาร-และ-จัดอันดับ** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const bankEmbed = new EmbedBuilder()
            .setColor('#34495E')
            .setTitle(`🏦 ธนาคารสมาคมนักผจญภัย - บัญชีของ ${message.author.username}`)
            .setDescription(`🏦 **เงินฝากในธนาคาร:** ${(db[userId].bank || 0).toLocaleString()} ฟรุ้งฟริ้ง\n💵 **เงินสดติดตัว:** ${db[userId].balance.toLocaleString()} ฟรุ้งฟริ้ง\n\n🛡️ *เงินในธนาคารปลอดภัยจากการปล้นรายบุคคล (!rob)*\n⚠️ *แต่ระวัง! แก๊งโจรอาจรวมตี้ปล้นธนาคารได้ (!heist)*`)
            .setFooter({ text: 'พิมพ์ !ฝาก <จำนวน> เพื่อฝากเงิน | !ถอน <จำนวน> เพื่อถอนเงิน' });
        return message.reply({ embeds: [bankEmbed] });
    }

    // ==========================================
    // 🔨 ระบบตีบวกอุปกรณ์ (!upgrade หรือ !ตีบวก)
    // ==========================================
    if (command === '!upgrade' || command === '!ตีบวก') {
        if (!message.channel.name.includes('ตลาดมืด')) {
            return message.reply('❌ กรุณาไปซื้อขาย ตีบวก และเสี่ยงโชคที่ห้อง **🛒-ตลาดมืด-และ-คาสิโน** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const weaponArg = args[0]?.toLowerCase();

        const targetWeapon = findWeapon(weaponArg);

        if (!targetWeapon) {
            ensureUserData(db, userId);
            let ownedList = "";
            for (const key of Object.keys(WEAPONS_CONFIG)) {
                const w = WEAPONS_CONFIG[key];
                const lvl = getWeaponLevel(db, userId, key);
                if (lvl >= 0) {
                    ownedList += `• ${w.displayName}: **+${lvl}**\n`;
                }
            }
            if (!ownedList) ownedList = "❌ คุณยังไม่มีอาวุธใดๆ เลย! เลือกซื้อได้จากร้านค้า (`!shop`)\n";

            const infoEmbed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle(`🔨 โรงตีเหล็กสมาคมนักผจญภัย (${message.author.username})`)
                .setDescription(`**อาวุธที่คุณครอบครอง:**\n${ownedList}\n💡 **วิธีตีบวก:** พิมพ์ \`!ตีบวก <ชื่ออาวุธ>\`\n*(เช่น \`!ตีบวก sword\`, \`!ตีบวก shield\`, \`!ตีบวก bow\`, \`!ตีบวก dagger\`, \`!ตีบวก staff\`)*`)
                .setFooter({ text: 'ระดับตีบวกสูงสุดคือ +10' });

            return message.reply({ embeds: [infoEmbed] });
        }

        if (!hasWeapon(db, userId, targetWeapon.id)) {
            return message.reply(`❌ คุณยังไม่มี **${targetWeapon.displayName}**! สั่งซื้อได้ที่ร้านค้า (\`!buy ${targetWeapon.id}\`)`);
        }

        const currentLevel = getWeaponLevel(db, userId, targetWeapon.id);
        if (currentLevel >= 10) return message.reply(`👑 **${targetWeapon.displayName} ของคุณอยู่ที่ระดับสูงสุด (+10) แล้ว!** ไม่สามารถตีบวกเพิ่มได้อีก`);

        const upgradeCosts = [1000, 2000, 3500, 5000, 8000, 12000, 18000, 25000, 35000, 50000];
        const successChances = [0.90, 0.80, 0.70, 0.60, 0.50, 0.40, 0.30, 0.25, 0.20, 0.15];

        const cost = upgradeCosts[currentLevel];
        const chance = successChances[currentLevel];

        if (db[userId].balance < cost) return message.reply(`💸 เงินสดติดตัวไม่พอ! ค่าตีบวก ${targetWeapon.displayName} เป็น +${currentLevel + 1} ต้องใช้ **${cost.toLocaleString()} ฟรุ้งฟริ้ง**`);

        db[userId].balance -= cost;

        const isSuccess = Math.random() < chance;
        let resultMsg = "";

        if (isSuccess) {
            db[userId].inventory.weapons[targetWeapon.id] += 1;
            saveDB(db);
            resultMsg = `✨ **สำเร็จ!!** อัปเกรดอาวุธเป็น **${targetWeapon.displayName} +${currentLevel + 1}** เรียบร้อยแล้ว!`;
        } else {
            if (currentLevel >= 4) {
                db[userId].inventory.weapons[targetWeapon.id] -= 1;
                saveDB(db);
                resultMsg = `💥 **ล้มเหลว!** การตีบวกผิดพลาด... ระดับลดลงเหลือ **${targetWeapon.displayName} +${currentLevel - 1}** 😭`;
            } else {
                saveDB(db);
                resultMsg = `💔 **ล้มเหลว!** การตีบวกผิดพลาด แต่โชคดีที่ระดับอาวุธยังคงอยู่ที่ **+${currentLevel}**`;
            }
        }

        const upEmbed = new EmbedBuilder()
            .setColor(isSuccess ? '#2ECC71' : '#E74C3C')
            .setTitle(`🔨 โรงตีเหล็กสมาคมนักผจญภัย (${message.author.username})`)
            .setDescription(resultMsg)
            .setFooter({ text: `ค่าธรรมเนียม: ${cost.toLocaleString()} ฟรุ้งฟริ้ง | โอกาสสำเร็จ: ${Math.round(chance * 100)}%` });

        return message.reply({ embeds: [upEmbed] });
    }

    // ==========================================
    // 🧪 คำสั่งใช้ไอเทม (!use หรือ !ใช้)
    // ==========================================
    if (command === '!use' || command === '!ใช้') {
        if (!message.channel.name.includes('ป่ามอนสเตอร์')) {
            return message.reply('❌ กรุณาไปสุ่มสเตตัส ออกล่า และปล้นที่ห้อง **🌲-ป่ามอนสเตอร์** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const item = args[0]?.toLowerCase();
        if (!item) return message.reply('❌ ระบุไอเทมที่ต้องการใช้ด้วย (เช่น `!use potion` หรือ `!ใช้ โพชั่น`)');

        if (item === 'potion' || item === 'โพชั่น' || item === 'ยาโพชั่น') {
            const count = db[userId].inventory?.potion || 0;
            if (count <= 0) return message.reply('❌ คุณไม่มี **🧪 ยาโพชั่นเร่งสปีด** ในกระเป๋า! สั่งซื้อได้ที่ `!shop`');

            db[userId].inventory.potion -= 1;
            db[userId].lastHunt = 0;
            saveDB(db);

            return message.reply('🧪 **ดื่มยาโพชั่นเร่งสปีดสำเร็จ!** คูลดาวน์การออกล่า (`!hunt`) ถูกรีเซ็ตทันที! ลุยต่อได้เลย!');
        } else {
            return message.reply('❌ ไม่พบไอเทมนี้ที่สามารถใช้งานได้');
        }
    }

    // ==========================================
    // ⚔️ ออกล่ามอนสเตอร์ (!hunt หรือ !ล่า)
    // ==========================================
    if (command === '!hunt' || command === '!ล่า') {
        if (!message.channel.name.includes('ป่ามอนสเตอร์')) {
            return message.reply('❌ กรุณาไปสุ่มสเตตัส ออกล่า และปล้นที่ห้อง **🌲-ป่ามอนสเตอร์** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const jailStatus = isInJail(db, userId);
        if (jailStatus.inJail) return message.reply(`🔒 **อยู่ในคุกอย่ามาซ่า!** คุณเป็นนักโทษอยู่! รออีก **${jailStatus.minutesLeft} นาที** ถึงจะออกล่าได้ พิมพ์ \`!bail\` เพื่อประกันตัว`);

        const cooldown = 3 * 60 * 1000;
        const timeNow = Date.now();
        if (!db[userId].lastHunt) db[userId].lastHunt = 0;

        if (timeNow - db[userId].lastHunt < cooldown) {
            const timeLeft = Math.ceil((cooldown - (timeNow - db[userId].lastHunt)) / 1000);
            return message.reply(`⏳ เหนื่อยหอบอยู่! รออีก **${timeLeft} วินาที** ค่อยออกไปล่าใหม่นะ`);
        }

        const swordLvl = getWeaponLevel(db, userId, 'sword');
        const shieldLvl = getWeaponLevel(db, userId, 'shield');
        const hasSword = swordLvl >= 0;
        const hasShield = shieldLvl >= 0;

        const winChance = hasSword ? 0.65 : 0.50;
        const isWin = Math.random() < winChance;

        const winScenarios = [
            "ไปตีสไลม์หน้าเมืองแล้วบังเอิญเจอก้อนทองคำแท่งดรอป", "ช่วยแมวของหัวหน้าหมู่บ้านลงจากต้นไม้ ได้รับรางวัลอย่างงาม",
            "ปราบบอสก็อบลินที่ขโมยเสบียงหมู่บ้านสำเร็จ", "ขุดเจอสมบัติโจรสลัดที่ชายหาดลับ",
            "ตกปลาแต่ดันตกได้หีบสมบัติโบราณแทน", "สู้กับมังกรเพลิงและแอบจิ๊กเกล็ดมันมาขายได้ราคาดี",
            "รับจ้างเป็นบอดี้การ์ดให้พ่อค้าคาราวานจนจบเส้นทาง", "ไปสำรวจดันเจี้ยนร้างแล้วเจอถุงเงินของใครไม่รู้ตกอยู่",
            "เด็ดสมุนไพรหายากไปขายให้ร้านปรุงยา", "ชนะการประลองดาบในงานเทศกาลเมือง",
            "ช่วยคุณยายถือของข้ามถนน ยายเลยให้ค่าขนมมา", "ล่าหมูป่ากลายพันธุ์ เอาเนื้อไปขายโรงเตี๊ยมคนหน้าตาดี",
            "ไขปริศนาของสฟิงซ์ได้สำเร็จ สฟิงซ์เลยจ่ายค่าผ่านทางให้", "ปราบนางเงือกไซเรนที่หลอกชาวประมง",
            "เก็บอาวุธระดับ SSR ที่ตกอยู่กลางป่าไปขายร้านของเก่า", "ไปทวงหนี้ให้มาเฟียต่างโลก ได้ส่วนแบ่งซะงั้น",
            "เจอจุดฟาร์มบัคในดันเจี้ยน ตีมอนสเตอร์ดรอปเงินรัวๆ", "ร้องเพลงเปิดหมวกหน้าลานน้ำพุ มีคนใจดีโยนเงินให้",
            "ล่าหมาป่าหิมะ เอาขนไปขายให้ช่างตัดเสื้อระดับพระราชวัง", "แอบขโมยไข่มังกรไปขายตลาดมืด (รอดมาได้ไงเนี่ย!)",
            "ช่วยเจ้าหญิงที่ถูกโจรลักพาตัว พระราชาเลยตบรางวัลให้", "ขายตั๋วคอนเสิร์ตนักกวีชื่อดังผีหลอก (แอบโก่งราคา)",
            "รับเหมาทำความสะอาดกิลด์นักผจญภัยจนเงาวับ", "บังเอิญไปเตะหินแล้วเจอแร่โอริคัลคุม",
            "ปราบบอสลับที่โผล่มาตอนเที่ยงคืนได้แบบฟลุคๆ", "เป็นนายแบบ/นางแบบให้จิตรกรเอกของเมือง",
            "รับจ้างแบกของขึ้นภูเขาไฟมรณะรอดกลับมาได้", "สกัดจับโจรขโมยชุดชั้นใน ได้รางวัลนำจับจากกรมตำรวจ",
            "เจอสูตรอาหารลับในซากปรักหักพัง เอาไปขายให้มาสเตอร์", "ฟาร์มมอนสเตอร์จนเลเวลอัป พระเจ้าระบบเลยโอนเงินรางวัลให้"
        ];

        const loseScenarios = [
            "ไปตีสไลม์แต่สะดุดก้อนหินล้ม ดาบหัก ต้องจ่ายค่าซ่อม", "โดนมังกรพ่นไฟใส่ ชุดเกราะไหม้เกรียม ต้องซื้อใหม่",
            "โดนก็อบลินล้วงกระเป๋าตอนเผลอหลับใต้ต้นไม้", "โดนพ่อค้าหน้าเลือดหลอกขายแผนที่สมบัติปลอม",
            "เดินตกหลุมพรางในดันเจี้ยน เสียค่ารักษาพยาบาล", "ไปท้าสู้กับอัศวินศักดิ์สิทธิ์แล้วแพ้ยับ โดนไถเงิน",
            "กินเห็ดพิษในป่า ท้องร่วงหนัก ต้องจ่ายค่ายาถอนพิษ", "โดนตำรวจเวทมนตร์จับข้อหาใช้สกิลเสียงดังรบกวนชาวบ้าน",
            "แวะบ่อนคาสิโนเมืองหน้า โดนต้มตุ๋นจนหมดตัว", "เช่าม้าไปทำเควสต์ แต่ม้าหนีเตลิด ต้องจ่ายค่าปรับให้เจ้าของ",
            "รับเควสต์ปราบจอมมาร แต่ดันไปพังบ้านชาวบ้านพัง โดนฟ้องร้อง", "อาวุธหลุดมือตอนสู้กับบอส ปลิวตกกระทะลาวา",
            "โดนแม่มดหลอกขายยาโพชั่นหมดอายุ ท้องเสียไป 3 วัน", "ปาร์ตี้แตก โดนเพื่อนในทีมเชิดเงินหนี",
            "ไปล่าหมีป่า แต่โดนหมีวิ่งไล่จนต้องโยนถุงเงินทิ้งเพื่อเอาชีวิตรอด", "เดินเหม่อลอย ชนรูปปั้นเทพเจ้าแตก ต้องจ่ายค่าเสียหาย",
            "โดนแก๊งอันธพาลดักปล้นหน้าลานกว้าง", "จ่ายค่าผ่านทางให้โทรลล์ใต้สะพานแบบขูดเลือดขูดเนื้อ",
            "เผลอหลับใต้ต้นไม้ โดนลิงปีศาจขโมยเหรียญไปหมด", "โดนแฟรี่ตัวแสบเสกให้เงินในกระเป๋ากลายเป็นใบไม้",
            "เมาเหล้าที่โรงเตี๊ยม เลี้ยงทุกคนทั้งร้าน ตื่นมาบิลบานตะไท", "ซื้อดาบในตลาดมืด โดนย้อมแมวเอาพลาสติกมาขาย",
            "โดนจอมปีศาจขู่กรรโชกทรัพย์หน้าปากซอย", "ทำสร้อยคอเวทมนตร์หล่นหายระหว่างสู้กับสไลม์",
            "วิ่งหนีซอมบี้จนรองเท้าขาด ต้องซื้อคู่ใหม่ระดับพรีเมียม", "เผลอไปเหยียบหางมังกร โดนเรียกค่าทำขวัญบานตะไท",
            "รับเควสต์ส่งของแต่ทำของพัง ต้องชดใช้ค่าเสียหาย", "โดนระบบเกมหักภาษีรายได้ประจำเดือนแบบงงๆ",
            "เผลอเปย์เงินให้นักบวชสาว(ปลอม)ในดิสคอร์ดกิลด์", "โดนจับข้อหาล่ามอนสเตอร์สงวนในเขตอนุรักษ์ป่าไม้"
        ];

        db[userId].lastHunt = timeNow;
        let resultMessage = "";

        if (isWin) {
            const baseAmount = Math.floor(Math.random() * (1200 - 300 + 1)) + 300;
            const swordBonus = swordLvl > 0 ? swordLvl * 150 : 0;
            const hasRing = (db[userId].inventory?.ring || 0) > 0;
            const rawReward = baseAmount + swordBonus;
            const ringBonus = hasRing ? Math.floor(rawReward * 0.2) : 0;
            const finalReward = rawReward + ringBonus;

            const scenario = winScenarios[Math.floor(Math.random() * winScenarios.length)];
            db[userId].balance += finalReward;

            let bonusNotes = [];
            if (hasSword) bonusNotes.push(`ดาบชนะ +15%`);
            if (swordLvl > 0) bonusNotes.push(`ดาบ +${swordLvl}: +${swordBonus}`);
            if (hasRing) bonusNotes.push(`แหวน 💍: +${ringBonus}`);
            const noteStr = bonusNotes.length > 0 ? `\n> *(${bonusNotes.join(' | ')})*` : '';

            resultMessage = `⚔️ **ออกล่าสำเร็จ!** ${noteStr}\n> ${scenario}\n🎉 ได้รับเงิน **${finalReward.toLocaleString()} ฟรุ้งฟริ้ง!** (เงินสดคงเหลือ: ${db[userId].balance.toLocaleString()})`;
        } else {
            const baseAmount = Math.floor(Math.random() * (600 - 100 + 1)) + 100;
            let finalLoss = baseAmount;
            let shieldMsg = "";

            if (hasShield) {
                const discount = 30 + Math.max(0, shieldLvl) * 5; // 30% - 80%
                finalLoss = Math.floor(baseAmount * (1 - discount / 100));
                shieldMsg = `\n🛡️ *โล่ศักดิ์สิทธิ์ +${shieldLvl} ช่วยลดความเสียหายลง ${discount}%!*`;
            }

            const scenario = loseScenarios[Math.floor(Math.random() * loseScenarios.length)];
            db[userId].balance = Math.max(0, db[userId].balance - finalLoss);
            resultMessage = `💀 **ภารกิจล้มเหลว!** ${shieldMsg}\n> ${scenario}\n💸 เสียเงินไป **${finalLoss.toLocaleString()} ฟรุ้งฟริ้ง!** (เงินสดคงเหลือ: ${db[userId].balance.toLocaleString()})`;
        }

        saveDB(db);

        const huntEmbed = new EmbedBuilder()
            .setColor(isWin ? '#00FF00' : '#FF0000')
            .setAuthor({ name: `${message.author.username} ออกผจญภัย...`, iconURL: message.author.displayAvatarURL() })
            .setDescription(resultMessage);

        return message.reply({ embeds: [huntEmbed] });
    }

    // ==========================================
    // 🎲 เสี่ยงโชค/มินิเกม (!cf และ !slots)
    // ==========================================
    if (command === '!cf' || command === '!coinflip') {
        if (!message.channel.name.includes('ตลาดมืด')) {
            return message.reply('❌ กรุณาไปซื้อขาย ตีบวก และเสี่ยงโชคที่ห้อง **🛒-ตลาดมืด-และ-คาสิโน** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const jailStatus = isInJail(db, userId);
        if (jailStatus.inJail) return message.reply(`🔒 **อยู่ในคุกอย่ามาซ่า!** คุณเป็นนักโทษอยู่! รออีก **${jailStatus.minutesLeft} นาที** ถึงจะเสี่ยงโชคได้ พิมพ์ \`!bail\` เพื่อประกันตัว`);

        const choice = args[0]?.toLowerCase();
        const bet = parseInt(args[1]);

        if (!choice || (choice !== 'หัว' && choice !== 'ก้อย')) return message.reply('❌ วิธีเล่น: พิมพ์ `!cf หัว <เงิน>` หรือ `!cf ก้อย <เงิน>`');
        if (!bet || bet <= 0 || isNaN(bet)) return message.reply('❌ ใส่จำนวนเงินแทงที่ถูกต้องด้วยครับ');
        if (db[userId].balance < bet) return message.reply('💸 ฟรุ้งฟริ้งไม่พอแทง! ไปหาเงินมาก่อน');

        const result = Math.random() < 0.5 ? 'หัว' : 'ก้อย';

        if (choice === result) {
            db[userId].balance += bet;
            saveDB(db);
            return message.reply(`🪙 เหรียญออก **[ ${result} ]** !! 🎉 คุณทายถูก! ได้รับเงินเพิ่ม **${bet} ฟรุ้งฟริ้ง** (ยอดรวม: ${db[userId].balance})`);
        } else {
            db[userId].balance -= bet;
            saveDB(db);
            return message.reply(`🪙 เหรียญออก **[ ${result} ]** !! 😭 คุณทายผิด! เสียเงินไป **${bet} ฟรุ้งฟริ้ง** (ยอดคงเหลือ: ${db[userId].balance})`);
        }
    }

    if (command === '!slots') {
        if (!message.channel.name.includes('ตลาดมืด')) {
            return message.reply('❌ กรุณาไปซื้อขาย ตีบวก และเสี่ยงโชคที่ห้อง **🛒-ตลาดมืด-และ-คาสิโน** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const jailStatus = isInJail(db, userId);
        if (jailStatus.inJail) return message.reply(`🔒 **อยู่ในคุกอย่ามาซ่า!** คุณเป็นนักโทษอยู่! รออีก **${jailStatus.minutesLeft} นาที** ถึงจะเสี่ยงโชคได้ พิมพ์ \`!bail\` เพื่อประกันตัว`);

        const bet = parseInt(args[0]);
        if (!bet || bet <= 0 || isNaN(bet)) return message.reply('❌ วิธีเล่น: พิมพ์ `!slots <จำนวนเงิน>`');
        if (db[userId].balance < bet) return message.reply('💸 ฟรุ้งฟริ้งไม่พอลงตู้สล็อต!');

        const items = ['🎰', '💎', '👑', '7️⃣', '💣', '🍒'];
        const reel1 = items[Math.floor(Math.random() * items.length)];
        const reel2 = items[Math.floor(Math.random() * items.length)];
        const reel3 = items[Math.floor(Math.random() * items.length)];

        let resultText = "";

        if (reel1 === reel2 && reel2 === reel3) {
            const reward = bet * 5;
            db[userId].balance += reward;
            resultText = `🎉 **JACKPOT!!** ออกเหมือนกันหมด! คุณได้รับเงิน **${reward} ฟรุ้งฟริ้ง!** (5 เท่า)`;
        } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
            const reward = bet * 2;
            db[userId].balance += reward;
            resultText = `✨ **เกือบเทพ!** ออกเหมือนกัน 2 ช่อง! คุณได้รับเงิน **${reward} ฟรุ้งฟริ้ง!** (2 เท่า)`;
        } else {
            db[userId].balance -= bet;
            resultText = `💸 **เกลือกระจาย!** ไม่ตรงกันเลย คุณเสียเงินไป **${bet} ฟรุ้งฟริ้ง**`;
        }

        saveDB(db);

        const slotEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('🎰 ตู้สล็อตสมาคมนักผจญภัย')
            .setDescription(`[ ${reel1} | ${reel2} | ${reel3} ]\n\n${resultText}\n💰 ยอดคงเหลือ: **${db[userId].balance} ฟรุ้งฟริ้ง**`);

        return message.reply({ embeds: [slotEmbed] });
    }

    // ==========================================
    // 🤝 สังคมและการโอนเงิน (!pay และ !rob)
    // ==========================================
    if (command === '!pay') {
        if (!message.channel.name.includes('ธนาคาร')) {
            return message.reply('❌ กรุณาไปทำธุรกรรมการเงินและดูอันดับที่ห้อง **🏦-ธนาคาร-และ-จัดอันดับ** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!target) return message.reply('❌ คุณต้องแท็กเพื่อนที่ต้องการโอนเงินให้ด้วย (เช่น `!pay @ชื่อเพื่อน 100`)');
        if (target.id === userId) return message.reply('❌ โอนเงินให้ตัวเองไม่ได้เว้ย!');
        if (!amount || amount <= 0 || isNaN(amount)) return message.reply('❌ ใส่จำนวนเงินที่ถูกต้องด้วย');
        if (db[userId].balance < amount) return message.reply('💸 ฟรุ้งฟริ้งไม่พอ! ไปทำงานหาเงินก่อนไป');

        // 🛑 ปรับให้ใช้ ensureUserData เพื่อความชัวร์และไม่บัค
        ensureUserData(db, target.id);

        db[userId].balance -= amount;
        db[target.id].balance += amount;
        saveDB(db);

        return message.reply(`💸 **${message.author.username}** ได้โอนเงิน **${amount} ฟรุ้งฟริ้ง** ให้กับ **${target.username}** เรียบร้อยแล้ว!`);
    }

    if (command === '!rob') {
        if (!message.channel.name.includes('ป่ามอนสเตอร์')) {
            return message.reply('❌ กรุณาไปสุ่มสเตตัส ออกล่า และปล้นที่ห้อง **🌲-ป่ามอนสเตอร์** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const jailStatus = isInJail(db, userId);
        if (jailStatus.inJail) return message.reply(`🔒 **อยู่ในคุกอย่ามาซ่า!** คุณเป็นนักโทษอยู่! รออีก **${jailStatus.minutesLeft} นาที** ถึงจะปล้นได้ พิมพ์ \`!bail\` เพื่อประกันตัว`);

        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ จะปล้นใคร แท็กชื่อด้วย! (เช่น `!rob @ชื่อเพื่อน`)');
        if (target.id === userId) return message.reply('❌ บ้าไปแล้ว ปล้นตัวเองทำไม!');

        ensureUserData(db, target.id);
        if (db[target.id].balance < 100) return message.reply('❌ เป้าหมายจนเกินไป ปล้นไปก็ไม่ได้อะไร ปล่อยเขาไปเถอะ...');
        if (db[userId].balance < 500) return message.reply('❌ คุณต้องมีฟรุ้งฟริ้งติดตัวอย่างน้อย 500 เพื่อเป็นค่าปรับเผื่อโดนจับหรือเจอยันต์สะท้อน!');

        const cooldown = 1 * 60 * 1000;
        const timeNow = Date.now();
        if (!db[userId].lastRob) db[userId].lastRob = 0;

        if (timeNow - db[userId].lastRob < cooldown) {
            const timeLeft = Math.ceil((cooldown - (timeNow - db[userId].lastRob)) / 1000);
            return message.reply(`⏳ ใจเย็นสายย่อ! คุณเพิ่งปล้นไป ต้องรอคูลดาวน์อีก **${timeLeft} วินาที** ถึงจะปล้นใหม่ได้`);
        }

        db[userId].lastRob = timeNow;

        // 1. เช็คยันต์ป้องกันภัย (amulet)
        const targetAmulet = db[target.id].inventory?.amulet || 0;
        if (targetAmulet > 0) {
            const penalty = Math.floor(Math.random() * (1500 - 500 + 1)) + 500;
            const actualPenalty = Math.min(db[userId].balance, penalty);
            db[userId].balance -= actualPenalty;
            db[target.id].balance += actualPenalty;

            db[target.id].inventory.amulet -= 1;
            const remainingAmulets = db[target.id].inventory.amulet;
            const amuletStatus = `🛡️ **ยันต์ของเป้าหมายถูกใช้งานและสลายไป 1 ชิ้น!** (ยันต์คงเหลือ: ${remainingAmulets} ชิ้น)`;

            saveDB(db);

            const amuletEmbed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle('🛡️ ยันต์ป้องกันภัยทำงาน!')
                .setDescription(`⚡ **${message.author.username}** พยายามจะเข้าไปปล้น **${target.username}** แต่เจอยันต์ศักดิ์สิทธิ์เปล่งแสงทำลายโอกาสปล้น!\n\n> ${amuletStatus}\n> 💥 **${message.author.username}** โดนพลังยันต์สะท้อนกลับ เสียเงิน **${actualPenalty.toLocaleString()} ฟรุ้งฟริ้ง!** (โอนเป็นค่าทำขวัญให้เหยื่อ)`);

            return message.reply({ embeds: [amuletEmbed] });
        }

        // 2. เช็คโล่ศักดิ์สิทธิ์ (shield) ของเป้าหมาย
        const targetShieldLvl = getWeaponLevel(db, target.id, 'shield');
        if (targetShieldLvl >= 0) {
            const reflectChance = (25 + Math.max(0, targetShieldLvl) * 5) / 100;
            if (Math.random() < reflectChance) {
                const penalty = Math.floor(Math.random() * (1500 - 500 + 1)) + 500;
                const actualPenalty = Math.min(db[userId].balance, penalty);
                db[userId].balance -= actualPenalty;
                db[target.id].balance += actualPenalty;
                saveDB(db);

                const shieldEmbed = new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle('🛡️ โล่ศักดิ์สิทธิ์สะท้อนการถูกปล้น!')
                    .setDescription(`⚡ **${message.author.username}** พยายามจะปล้น **${target.username}** แต่ถูก **🛡️ โล่ศักดิ์สิทธิ์ +${targetShieldLvl}** ยกขึ้นมาบล็อกและสะท้อนกลับ!\n\n> 💥 **${message.author.username}** เสียเงิน **${actualPenalty.toLocaleString()} ฟรุ้งฟริ้ง** (โอนชดเชยให้เป้าหมาย)`);

                return message.reply({ embeds: [shieldEmbed] });
            }
        }

        // 3. คิดโอกาสปล้นโดยมีดสั้น (dagger)
        const attackerDaggerLvl = getWeaponLevel(db, userId, 'dagger');
        const robChance = attackerDaggerLvl >= 0 ? 0.70 : 0.60;
        const chance = Math.random();

        if (chance < robChance) {
            let percentWin = Math.floor(Math.random() * (95 - 20 + 1)) + 20;
            if (attackerDaggerLvl > 0) percentWin += (attackerDaggerLvl * 2);

            const stolenAmount = Math.floor((db[target.id].balance * percentWin) / 100);

            db[target.id].balance = Math.max(0, db[target.id].balance - stolenAmount);
            db[userId].balance += stolenAmount;
            saveDB(db);

            const daggerNote = attackerDaggerLvl >= 0 ? ` *(มีดสั้น +${attackerDaggerLvl} ช่วยเพิ่มโอกาสสำเร็จ & เงินที่ได้)*` : '';
            return message.reply(`🥷 **สำเร็จ!** คุณแอบขโมยถุงเงินของ ${target.username} มาได้ **${stolenAmount.toLocaleString()} ฟรุ้งฟริ้ง!** (${percentWin}% ของเป้าหมาย)${daggerNote} 🏃‍♂️💨`);
        } else {
            const percentLose = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
            const lostAmount = Math.floor((db[userId].balance * percentLose) / 100);

            db[userId].balance -= lostAmount;
            saveDB(db);

            return message.reply(`🚨 **โดนจับได้!** ยามหน้าประตูเมืองจับคุณขังคุก โดนยึดค่าปรับไป **${lostAmount.toLocaleString()} ฟรุ้งฟริ้ง** (${percentLose}% ของเงินคุณ) สมน้ำหน้า! 😂`);
        }
    }

    // ==========================================
    // 🛒 1. ระบบร้านค้าและกระเป๋าเก็บของ (!shop, !buy, !inv)
    // ==========================================
    if (command === '!shop' || command === '!ร้านค้า') {
        if (!message.channel.name.includes('ตลาดมืด')) {
            return message.reply('❌ กรุณาไปซื้อขาย ตีบวก และเสี่ยงโชคที่ห้อง **🛒-ตลาดมืด-และ-คาสิโน** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const shopEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🛒 ร้านค้าสมาคมนักผจญภัย')
            .setDescription('เลือกซื้อไอเทมและอาวุธเพื่อช่วยเหลือในการเดินทางได้ที่นี่!\nพิมพ์ `!buy <ชื่อไอเทม/ชื่ออาวุธ>` เพื่อทำการซื้อ')
            .addFields(
                { name: '⚔️ ดาบอัศวิน (`sword`)', value: '💰 **ราคา:** 3,000 ฟรุ้งฟริ้ง\n✨ เพิ่มโอกาสออกล่าชนะเป็น **65%** + ดาเมจบอส **+50 DMG**', inline: false },
                { name: '🛡️ โล่ศักดิ์สิทธิ์ (`shield`)', value: '💰 **ราคา:** 3,500 ฟรุ้งฟริ้ง\n✨ ลดเงินที่เสียเวลาล่าล้มเหลว **30%** + สะท้อนการถูกปล้น **25%**', inline: false },
                { name: '🏹 ธนูเอลฟ์ (`bow`)', value: '💰 **ราคา:** 4,000 ฟรุ้งฟริ้ง\n✨ เพิ่มโอกาสคริติคอลเวลาตีบอสเป็น **35%** + ตีแรงขึ้น', inline: false },
                { name: '🗡️ มีดสั้นนักฆ่า (`dagger`)', value: '💰 **ราคา:** 4,500 ฟรุ้งฟริ้ง\n✨ เพิ่มโอกาสปล้น (`!rob`) เป็น **70%** + ได้เงินปล้นเพิ่มตามบวก', inline: false },
                { name: '🧙‍♂️ คทาเวทมนตร์ (`staff`)', value: '💰 **ราคา:** 5,000 ฟรุ้งฟริ้ง\n✨ สร้างความเสียหายตีบอสมหาศาล **+120 DMG** (สายระเบิดบอส!)', inline: false },
                { name: '🛡️ ยันต์ป้องกันภัย (`amulet`)', value: '💰 **ราคา:** 1,500 ฟรุ้งฟริ้ง | ป้องกันการถูกปล้น (`!rob`) อัตโนมัติ 1 ครั้ง', inline: false },
                { name: '🧪 ยาโพชั่นเร่งสปีด (`potion`)', value: '💰 **ราคา:** 800 ฟรุ้งฟริ้ง | รีเซ็ตคูลดาวน์ออกล่าทันที (`!use potion`)', inline: false },
                { name: '💍 แหวนแห่งโชคลาภ (`ring`)', value: '💰 **ราคา:** 10,000 ฟรุ้งฟริ้ง | เพิ่มเงิน `!daily` และ `!hunt` ขึ้น **20%** ถาวร', inline: false }
            )
            .setFooter({ text: 'พิมพ์ !buy <ไอเทม> เพื่อสั่งซื้อ | พิมพ์ !ตีบวก เพื่ออัปเกรดอาวุธ' });

        return message.reply({ embeds: [shopEmbed] });
    }

    if (command === '!buy' || command === '!ซื้อ') {
        if (!message.channel.name.includes('ตลาดมืด')) {
            return message.reply('❌ กรุณาไปซื้อขาย ตีบวก และเสี่ยงโชคที่ห้อง **🛒-ตลาดมืด-และ-คาสิโน** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const item = args[0]?.toLowerCase();
        if (!item) return message.reply('❌ กรุณาระบุชื่อไอเทมหรืออาวุธที่ต้องการซื้อ (เช่น `!buy sword`, `!buy shield`, `!buy amulet`)');

        const targetWep = findWeapon(item);
        if (targetWep) {
            if (hasWeapon(db, userId, targetWep.id)) return message.reply(`❌ คุณมี **${targetWep.displayName}** อยู่แล้ว! (ใช้คำสั่ง \`!ตีบวก ${targetWep.id}\` เพื่ออัปเกรด)`);
            if (db[userId].balance < targetWep.price) return message.reply(`💸 เงินสดไม่พอ! ${targetWep.displayName} ราคา **${targetWep.price.toLocaleString()} ฟรุ้งฟริ้ง**`);

            db[userId].balance -= targetWep.price;
            db[userId].inventory.weapons[targetWep.id] = 1; // +0 level
            saveDB(db);

            return message.reply(`🎉 สั่งซื้อ **${targetWep.displayName}** สำเร็จ! ใช้คำสั่ง \`!ตีบวก ${targetWep.id}\` เพื่ออัปเกรดได้เลย!`);
        }

        if (item === 'amulet' || item === 'ยันต์') {
            const price = 1500;
            if (db[userId].balance < price) return message.reply(`💸 เงินสดไม่พอ! ยันต์ป้องกันภัยราคา **${price.toLocaleString()} ฟรุ้งฟริ้ง**`);

            db[userId].balance -= price;
            db[userId].inventory.amulet = (db[userId].inventory.amulet || 0) + 1;
            saveDB(db);

            return message.reply(`🎉 สั่งซื้อ **🛡️ ยันต์ป้องกันภัย** สำเร็จ! ตอนนี้คุณมีทั้งหมด **${db[userId].inventory.amulet} ชิ้น** (เงินสดคงเหลือ: ${db[userId].balance.toLocaleString()} ฟรุ้งฟริ้ง)`);
        } else if (item === 'potion' || item === 'โพชั่น' || item === 'ยาโพชั่น') {
            const price = 800;
            if (db[userId].balance < price) return message.reply(`💸 เงินสดไม่พอ! ยาโพชั่นเร่งสปีดราคา **${price.toLocaleString()} ฟรุ้งฟริ้ง**`);

            db[userId].balance -= price;
            db[userId].inventory.potion = (db[userId].inventory.potion || 0) + 1;
            saveDB(db);

            return message.reply(`🎉 สั่งซื้อ **🧪 ยาโพชั่นเร่งสปีด** สำเร็จ! ตอนนี้คุณมี **${db[userId].inventory.potion} ขวด** (ใช้พิมพ์ \`!use potion\`)`);
        } else if (item === 'ring' || item === 'แหวน') {
            const price = 10000;
            if ((db[userId].inventory.ring || 0) > 0) return message.reply('❌ คุณมีแหวนแห่งโชคลาภอยู่แล้ว! (ครอบครองได้สูงสุด 1 วง)');
            if (db[userId].balance < price) return message.reply(`💸 เงินสดไม่พอ! แหวนแห่งโชคลาภราคา **${price.toLocaleString()} ฟรุ้งฟริ้ง**`);

            db[userId].balance -= price;
            db[userId].inventory.ring = 1;
            saveDB(db);

            return message.reply(`🎉 สั่งซื้อ **💍 แหวนแห่งโชคลาภ** สำเร็จ! ได้รับโบนัสเงินเพิ่ม 20% จากการรับเงินเดือนและออกล่าแล้ว!`);
        } else {
            return message.reply('❌ ไม่พบไอเทมหรืออาวุธนี้ในร้านค้า! พิมพ์ `!shop` เพื่อดูรายการที่มีขาย');
        }
    }

    if (command === '!inv' || command === '!bag' || command === '!กระเป๋า') {
        if (!message.channel.name.includes('ตลาดมืด')) {
            return message.reply('❌ กรุณาไปซื้อขาย ตีบวก และเสี่ยงโชคที่ห้อง **🛒-ตลาดมืด-และ-คาสิโน** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        ensureUserData(db, userId);

        let weaponsText = "";
        for (const key of Object.keys(WEAPONS_CONFIG)) {
            const w = WEAPONS_CONFIG[key];
            const lvl = getWeaponLevel(db, userId, key);
            if (lvl >= 0) {
                weaponsText += `${w.displayName}: **+${lvl}**\n`;
            }
        }
        if (!weaponsText) weaponsText = "ยังไม่มีอาวุธ";

        const amuletCount = db[userId].inventory?.amulet || 0;
        const potionCount = db[userId].inventory?.potion || 0;
        const hasRing = (db[userId].inventory?.ring || 0) > 0;
        const ringText = hasRing ? '✅ สวมใส่อยู่ (+20% Money)' : '❌ ยังไม่มี';

        const invEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle(`🎒 กระเป๋าเดินทางของ ${message.author.username}`)
            .setDescription(`💵 **เงินสดติดตัว:** ${db[userId].balance.toLocaleString()} ฟรุ้งฟริ้ง\n🏦 **เงินในธนาคาร:** ${(db[userId].bank || 0).toLocaleString()} ฟรุ้งฟริ้ง`)
            .addFields(
                { name: '⚔️ อาวุธในครอบครอง', value: weaponsText, inline: false },
                { name: '🛡️ ยันต์ป้องกันภัย', value: `${amuletCount} ชิ้น`, inline: true },
                { name: '🧪 ยาโพชั่นเร่งสปีด', value: `${potionCount} ขวด`, inline: true },
                { name: '💍 แหวนแห่งโชคลาภ', value: ringText, inline: true }
            )
            .setThumbnail(message.author.displayAvatarURL());

        return message.reply({ embeds: [invEmbed] });
    }

    // ==========================================
    // 🏆 2. ระบบตารางอันดับเศรษฐี (!rich หรือ !leaderboard)
    // ==========================================
    if (command === '!rich' || command === '!leaderboard' || command === '!อันดับ') {
        if (!message.channel.name.includes('ธนาคาร')) {
            return message.reply('❌ กรุณาไปทำธุรกรรมการเงินและดูอันดับที่ห้อง **🏦-ธนาคาร-และ-จัดอันดับ** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const userIds = Object.keys(db).filter(id => id !== 'boss');

        userIds.sort((a, b) => {
            const netA = (db[a].balance || 0) + (db[a].bank || 0);
            const netB = (db[b].balance || 0) + (db[b].bank || 0);
            return netB - netA;
        });

        const top10 = userIds.slice(0, 10);
        let leaderboardText = "";

        const medals = ['🥇', '🥈', '🥉'];

        for (let i = 0; i < top10.length; i++) {
            const id = top10[i];
            const medal = medals[i] || `**${i + 1}.**`;
            const netWorth = (db[id].balance || 0) + (db[id].bank || 0);
            leaderboardText += `${medal} <@${id}> - **${netWorth.toLocaleString()}** ฟรุ้งฟริ้ง\n`;
        }

        if (!leaderboardText) leaderboardText = "ยังไม่มีผู้เล่นในระบบ...";

        const lbEmbed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('🏆 ตารางอันดับผู้ผจญภัยที่ร่ำรวยที่สุด')
            .setDescription(leaderboardText)
            .setTimestamp()
            .setFooter({ text: 'อัปเดตข้อมูลแบบเรียลไทม์' });

        return message.reply({ embeds: [lbEmbed] });
    }

    // ==========================================
    // 👹 4. ระบบสู้บอสโลก (!boss และ !attack)
    // ==========================================
    if (command === '!boss' || command === '!บอส') {
        if (!message.channel.name.includes('บอสโลก')) {
            return message.reply('❌ กรุณาไปเช็คสถานะและโจมตีบอสที่ห้อง **🐉-ลานประลองบอสโลก** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const boss = db['boss'];

        const percentage = Math.max(0, boss.hp / boss.maxHp);
        const filled = Math.round(percentage * 10);
        const empty = 10 - filled;
        const hpBar = '🟩'.repeat(filled) + '⬛'.repeat(empty);

        const dmgEntries = Object.entries(boss.damages || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
        let topDmgText = "";
        dmgEntries.forEach(([id, dmg], idx) => {
            topDmgText += `${idx + 1}. <@${id}>: **${dmg.toLocaleString()}** DMG\n`;
        });
        if (!topDmgText) topDmgText = "ยังไม่มีใครโจมตีบอสตัวนี้";

        const bossEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle(`👹 ${boss.name}`)
            .setDescription(`**พลังชีวิต:** ${boss.hp.toLocaleString()} / ${boss.maxHp.toLocaleString()} HP\n${hpBar} (${Math.floor(percentage * 100)}%)\n\n💰 **รางวัลรวมเมื่อบอสพ่ายแพ้:** ${boss.reward.toLocaleString()} ฟรุ้งฟริ้ง\n⚔️ พิมพ์ \`!attack\` เพื่อร่วมโจมตีบอส!`)
            .addFields({ name: '🏆 ผู้ทำความเสียหายสูงสุด 5 อันดับแรก', value: topDmgText })
            .setFooter({ text: 'คูลดาวน์โจมตีบอส: 5 นาทีต่อครั้ง' });

        return message.reply({ embeds: [bossEmbed] });
    }

    if (command === '!attack' || command === '!ตีบอส') {
        if (!message.channel.name.includes('บอสโลก')) {
            return message.reply('❌ กรุณาไปเช็คสถานะและโจมตีบอสที่ห้อง **🐉-ลานประลองบอสโลก** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const boss = db['boss'];
        if (boss.hp <= 0) return message.reply('☠️ บอสเพิ่งพ่ายแพ้ไป! กำลังรอระบบเกิดบอสตัวใหม่...');

        const cooldown = 5 * 60 * 1000;
        const timeNow = Date.now();
        const lastAttack = db[userId].lastBossAttack || 0;

        if (timeNow - lastAttack < cooldown) {
            const timeLeftSec = Math.ceil((cooldown - (timeNow - lastAttack)) / 1000);
            const mins = Math.floor(timeLeftSec / 60);
            const secs = timeLeftSec % 60;
            return message.reply(`⏳ พักเหนื่อยจากการร่ายเวท! รอคูลดาวน์อีก **${mins} นาที ${secs} วินาที** ค่อยตีใหม่`);
        }

        // 🛑 เพิ่มระบบคำนวณพลังอาวุธแบบเต็มพิกัด (ดาบ, ธนู, คทา)
        const swordLvl = getWeaponLevel(db, userId, 'sword');
        const bowLvl = getWeaponLevel(db, userId, 'bow');
        const staffLvl = getWeaponLevel(db, userId, 'staff');

        let damage = Math.floor(Math.random() * (250 - 80 + 1)) + 80;
        let weaponBonusStr = [];

        // คำนวณดาเมจพื้นฐานจาก ดาบ และ คทา
        if (swordLvl >= 0) {
            const swordBonus = 50 + (swordLvl * 25);
            damage += swordBonus;
            weaponBonusStr.push(`ดาบอัศวิน +${swordBonus}`);
        }
        if (staffLvl >= 0) {
            const staffBonus = 120 + (staffLvl * 45);
            damage += staffBonus;
            weaponBonusStr.push(`คทาเวทมนตร์ +${staffBonus}`);
        }

        // คำนวณโอกาสติดคริติคอลจาก ธนู
        let critChance = bowLvl >= 0 ? 0.35 : 0.20;
        let critMult = 1.5;
        if (bowLvl >= 0) {
            critMult = Math.min(2.5, 1.5 + (bowLvl * 0.1));
            weaponBonusStr.push(`ธนูเอลฟ์ x${critMult.toFixed(1)}`);
        }

        const isCritical = Math.random() < critChance;
        if (isCritical) {
            damage = Math.floor(damage * critMult);
        }

        // หักพลังชีวิตบอส
        boss.hp = Math.max(0, boss.hp - damage);
        if (!boss.damages) boss.damages = {};
        boss.damages[userId] = (boss.damages[userId] || 0) + damage;
        db[userId].lastBossAttack = timeNow;

        const bonusNote = weaponBonusStr.length > 0 ? `*(โบนัสอาวุธ: ${weaponBonusStr.join(' | ')})*` : '';
        let attackResultMsg = `💥 **${message.author.username}** โจมตีใส่ ${boss.name}!\n> ${isCritical ? '💥 **CRITICAL HIT!!** ' : ''}สร้างความเสียหาย **${damage.toLocaleString()} DMG!** ${bonusNote}\n> HP บอสเหลือ: **${boss.hp.toLocaleString()} / ${boss.maxHp.toLocaleString()}**`;

        // บอสพ่ายแพ้
        if (boss.hp <= 0) {
            attackResultMsg += `\n\n🎉🎉 **บอสถูกพิชิตแล้ว!!** 🎉🎉\n⚔️ **${message.author.username}** ได้รับโบนัส **Last Hit 1,500 ฟรุ้งฟริ้ง!**`;

            db[userId].balance += 1500;

            const totalDmg = Object.values(boss.damages).reduce((a, b) => a + b, 0);
            let rewardSummary = "";

            for (const [attackerId, attackerDmg] of Object.entries(boss.damages)) {
                const sharePercent = attackerDmg / totalDmg;
                const rewardAmount = Math.floor(sharePercent * boss.reward);

                if (db[attackerId]) {
                    db[attackerId].balance += rewardAmount;
                }
                rewardSummary += `• <@${attackerId}>: ได้รับ **${rewardAmount.toLocaleString()}** ฟรุ้งฟริ้ง (${(sharePercent * 100).toFixed(1)}% DMG)\n`;
            }

            db['boss'] = {
                name: '🔥 มังกรดำเพลิงอสูร (Ancient Black Dragon)',
                hp: 6000,
                maxHp: 6000,
                reward: 12000,
                damages: {}
            };

            saveDB(db);

            const winEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('👑 ชัยชนะครั้งยิ่งใหญ่ของสมาคมนักผจญภัย!')
                .setDescription(attackResultMsg + '\n\n💰 **สรุปการรับส่วนแบ่งเงินรางวัล:**\n' + rewardSummary);

            return message.reply({ embeds: [winEmbed] });
        }

        saveDB(db);

        const attackEmbed = new EmbedBuilder()
            .setColor('#E67E22')
            .setDescription(attackResultMsg);

        return message.reply({ embeds: [attackEmbed] });
    }

    // ==========================================
    // 🏦 ระบบปล้นธนาคารรวม (!heist, !join, !bail)
    // ==========================================
    if (command === '!heist' || command === '!ปล้น') {
        if (!message.channel.name.includes('ป่ามอนสเตอร์')) {
            return message.reply('❌ กรุณาไปรวมแก๊งปล้นที่ห้อง **🌲-ป่ามอนสเตอร์** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }

        // เช็คสถานะนักโทษ
        const jailStatus = isInJail(db, userId);
        if (jailStatus.inJail) return message.reply(`🔒 **อยู่ในคุกอย่ามาซ่า!** คุณเป็นนักโทษอยู่! รออีก **${jailStatus.minutesLeft} นาที** ถึงจะปล้นได้ พิมพ์ \`!bail\` เพื่อประกันตัว`);

        // เช็คคูลดาวน์ 30 นาที
        const heistCooldown = 30 * 60 * 1000;
        const timeNow = Date.now();
        if (timeNow - (db[userId].lastHeist || 0) < heistCooldown) {
            const timeLeft = Math.ceil((heistCooldown - (timeNow - db[userId].lastHeist)) / (60 * 1000));
            return message.reply(`⏳ คุณเพิ่งปล้นไป! ต้องรอคูลดาวน์อีก **${timeLeft} นาที** ถึงจะปล้นใหม่ได้`);
        }

        // เช็คว่ามี heist กำลังเปิดอยู่ในห้องนี้ไหม
        if (activeHeists.has(message.channel.id)) {
            return message.reply('❌ มีการปล้นกำลังรวบรวมทีมอยู่แล้วในห้องนี้! พิมพ์ `!join` เพื่อเข้าร่วม');
        }

        // สร้าง heist session
        const heistSession = {
            leaderId: userId,
            leaderName: message.author.username,
            members: new Set([userId]),
            memberNames: { [userId]: message.author.username },
            createdAt: Date.now(),
            timeout: null
        };

        activeHeists.set(message.channel.id, heistSession);

        // ตั้ง timeout 60 วินาที
        heistSession.timeout = setTimeout(async () => {
            const session = activeHeists.get(message.channel.id);
            if (!session) return;
            activeHeists.delete(message.channel.id);

            if (session.members.size < 2) {
                const cancelEmbed = new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('❌ การปล้นถูกยกเลิก!')
                    .setDescription('หมดเวลาแล้ว! รวบรวมคนไม่ครบ 2 คน การปล้นถูกยกเลิก...\n\n> 💡 ครั้งหน้าชวนเพื่อนมาพิมพ์ `!join` ให้ทันภายใน 60 วินาทีนะ!');
                return message.channel.send({ embeds: [cancelEmbed] });
            }

            // Execute heist!
            executeHeist(message.channel, session);
        }, 60000);

        const heistEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('🚨 กำลังรวบรวมทีมปล้นธนาคาร!')
            .setDescription(`🦹 **${message.author.username}** กำลังวางแผนปล้นธนาคารกลาง!\n\n👥 พิมพ์ \`!join\` เพื่อเข้าร่วมแก๊ง (ต้องการอีก **1-4 คน**)\n⏱️ เหลือเวลา **60 วินาที**\n\n⚠️ **คำเตือน:** ถ้าปล้นพลาดจะโดนจับเข้าคุกทุกคน!\n• 🕒 ติดคุก 2 ชั่วโมง\n• 💸 ยึดเงินสดทั้งหมด 100%\n• 🗡️ 50% โอกาสอาวุธพังหรือลดระดับ`)
            .addFields(
                { name: '👥 สมาชิกแก๊ง (1/5)', value: `• ${message.author.username} (หัวหน้า)` },
                { name: '📊 โอกาสสำเร็จปัจจุบัน', value: '**5%** (เพิ่มคนเพิ่มโอกาส! สูงสุด 15%)' }
            )
            .setFooter({ text: '⚠️ ธนาคารไม่ใช่ Safe Zone อีกต่อไป! | ปล้นได้ 1-3% จากบัญชีทุกคน' });

        return message.reply({ embeds: [heistEmbed] });
    }

    if (command === '!join' || command === '!เข้าร่วม') {
        if (!message.channel.name.includes('ป่ามอนสเตอร์')) {
            return message.reply('❌ กรุณาไปรวมแก๊งปล้นที่ห้อง **🌲-ป่ามอนสเตอร์** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }

        const session = activeHeists.get(message.channel.id);
        if (!session) return message.reply('❌ ไม่มีการปล้นที่กำลังรวบรวมทีมอยู่ตอนนี้! ใช้ `!heist` เพื่อเริ่มปล้น');

        if (session.members.has(userId)) return message.reply('❌ คุณเข้าร่วมแก๊งนี้แล้ว! รอสมาชิกคนอื่นเข้ามา...');

        // เช็คสถานะนักโทษ
        const jailStatus = isInJail(db, userId);
        if (jailStatus.inJail) return message.reply(`🔒 **อยู่ในคุกอย่ามาซ่า!** คุณเป็นนักโทษอยู่! รออีก **${jailStatus.minutesLeft} นาที** ถึงจะร่วมปล้นได้`);

        // เช็คคูลดาวน์
        const heistCooldown = 30 * 60 * 1000;
        if (Date.now() - (db[userId].lastHeist || 0) < heistCooldown) {
            const timeLeft = Math.ceil((heistCooldown - (Date.now() - db[userId].lastHeist)) / (60 * 1000));
            return message.reply(`⏳ คุณเพิ่งปล้นไป! ต้องรอคูลดาวน์อีก **${timeLeft} นาที** ถึงจะร่วมปล้นใหม่ได้`);
        }

        if (session.members.size >= 5) return message.reply('❌ ทีมเต็มแล้ว (5/5 คน)!');

        // เพิ่มสมาชิก
        session.members.add(userId);
        session.memberNames[userId] = message.author.username;

        const memberCount = session.members.size;
        const chances = { 2: '5%', 3: '8%', 4: '12%', 5: '15%' };
        const currentChance = chances[memberCount] || '5%';

        let memberList = '';
        for (const [memberId, name] of Object.entries(session.memberNames)) {
            memberList += `• ${name}${memberId === session.leaderId ? ' (หัวหน้า)' : ''}\n`;
        }

        const joinEmbed = new EmbedBuilder()
            .setColor('#F39C12')
            .setTitle('🦹 สมาชิกใหม่เข้าร่วมแก๊ง!')
            .setDescription(`**${message.author.username}** เข้าร่วมทีมปล้นธนาคาร!`)
            .addFields(
                { name: `👥 สมาชิกแก๊ง (${memberCount}/5)`, value: memberList },
                { name: '📊 โอกาสสำเร็จปัจจุบัน', value: `**${currentChance}**` }
            );

        message.channel.send({ embeds: [joinEmbed] });

        // ถ้าครบ 5 คน เริ่มปล้นทันที!
        if (memberCount >= 5) {
            clearTimeout(session.timeout);
            activeHeists.delete(message.channel.id);
            executeHeist(message.channel, session);
        }

        return;
    }

    if (command === '!bail' || command === '!ประกันตัว') {
        if (!message.channel.name.includes('ธนาคาร')) {
            return message.reply('❌ กรุณาไปจ่ายค่าประกันตัวที่ห้อง **🏦-ธนาคาร-และ-จัดอันดับ** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }

        const jailStatus = isInJail(db, userId);
        if (!jailStatus.inJail) return message.reply('✅ คุณไม่ได้ติดคุกอยู่! สบายใจได้~');

        // คิดค่าประกันตัว = 20% ของเงินในธนาคาร หรือ 15,000 อย่างใดอย่างหนึ่งที่สูงกว่า
        const bankPercent = Math.floor((db[userId].bank || 0) * 0.20);
        const bailCost = Math.max(bankPercent, 15000);

        if ((db[userId].bank || 0) < bailCost) {
            return message.reply(`💸 **เงินในธนาคารไม่พอจ่ายค่าประกันตัว!**\n> ค่าประกันตัว: **${bailCost.toLocaleString()} ฟรุ้งฟริ้ง**\n> เงินในธนาคาร: **${(db[userId].bank || 0).toLocaleString()} ฟรุ้งฟริ้ง**\n> 😔 ต้องรอหมดโทษอีก **${jailStatus.minutesLeft} นาที**`);
        }

        db[userId].bank -= bailCost;
        db[userId].jailUntil = 0;
        saveDB(db);

        const bailEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('⚖️ ประกันตัวสำเร็จ!')
            .setDescription(`**${message.author.username}** จ่ายค่าประกันตัว **${bailCost.toLocaleString()} ฟรุ้งฟริ้ง** แล้ว!\n\n> 🏦 เงินในธนาคารคงเหลือ: **${db[userId].bank.toLocaleString()} ฟรุ้งฟริ้ง**\n> ✅ คุณเป็นอิสระแล้ว! กลับไปหาเงินได้เลย`)
            .setFooter({ text: '💡 ครั้งหน้าคิดให้ดีก่อนไปปล้นนะ!' });

        return message.reply({ embeds: [bailEmbed] });
    }
});

if (!TOKEN) {
    console.error("❌ ERROR: ไม่พบ TOKEN ใน environment variables (process.env.TOKEN)");
    console.error("👉 กรุณาตั้งค่า TOKEN ใน Dashboard ของ Discloud (หรือในไฟล์ .env)");
    process.exit(1);
}

client.login(TOKEN).catch(err => {
    console.error("❌ ไม่สามารถเข้าสู่ระบบ Discord ได้:", err.message);
});