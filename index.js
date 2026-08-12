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

function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));
}

client.once('ready', () => {
    console.log(`บอท ${client.user.tag} พร้อมเปิดบ่อน แจกฟรุ้งฟริ้ง และเปิดศึกตีบอสแล้ว! 🎲✨⚔️`);
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();

    let db = loadDB();
    const userId = message.author.id;

    // สร้างข้อมูลผู้ใช้เริ่มต้นหากเป็นผู้เล่นใหม่
    if (!db[userId]) {
        db[userId] = { balance: 0, lastDaily: 0, lastHunt: 0, lastBossAttack: 0, inventory: { amulet: 0, sword: 0 } };
    } else {
        if (!db[userId].inventory) {
            db[userId].inventory = { amulet: 0, sword: 0 };
        }
        if (db[userId].lastBossAttack === undefined) {
            db[userId].lastBossAttack = 0;
        }
    }

    // ==========================================
    // 📊 ระบบสุ่มสเตตัส (!status หรือ !สเตตัส)
    // ==========================================
    if (command === '!status' || command === '!สเตตัส') {
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
    if (command === '!bal' || command === '!money') {
        const balEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setDescription(`💰 **${message.author.username}** ตอนนี้คุณมีเงิน **${db[userId].balance}** ฟรุ้งฟริ้ง`);
        return message.reply({ embeds: [balEmbed] });
    }

    if (command === '!daily') {
        const cooldown = 24 * 60 * 60 * 1000;
        const timeNow = Date.now();
        const lastDaily = db[userId].lastDaily;

        if (timeNow - lastDaily < cooldown) {
            const timeLeft = Math.floor((cooldown - (timeNow - lastDaily)) / (60 * 60 * 1000));
            return message.reply(`⏳ ใจเย็นวัยรุ่น! คุณรับเงินเดือนไปแล้ว ต้องรออีก **${timeLeft} ชั่วโมง** ถึงจะรับได้ใหม่`);
        }

        db[userId].balance += 500;
        db[userId].lastDaily = timeNow;
        saveDB(db);

        return message.reply(`🎉 รับเงินเดือนสำเร็จ! คุณได้รับ **500 ฟรุ้งฟริ้ง** ✨ (ยอดรวม: ${db[userId].balance})`);
    }

    // ==========================================
    // ⚔️ ออกล่ามอนสเตอร์ (!hunt หรือ !ล่า)
    // ==========================================
    if (command === '!hunt' || command === '!ล่า') {
        const cooldown = 60 * 1000;
        const timeNow = Date.now();
        if (!db[userId].lastHunt) db[userId].lastHunt = 0;

        if (timeNow - db[userId].lastHunt < cooldown) {
            const timeLeft = Math.ceil((cooldown - (timeNow - db[userId].lastHunt)) / 1000);
            return message.reply(`⏳ เหนื่อยหอบอยู่! รออีก **${timeLeft} วินาที** ค่อยออกไปล่าใหม่นะ`);
        }

        // หากมีดาบอัศวิน จะเพิ่มอัตราการชนะเป็น 65% (ปกติ 50%)
        const hasSword = (db[userId].inventory?.sword || 0) > 0;
        const winChance = hasSword ? 0.65 : 0.50;
        const isWin = Math.random() < winChance;
        const amount = Math.floor(Math.random() * (1000 - 100 + 1)) + 100;

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
            const scenario = winScenarios[Math.floor(Math.random() * winScenarios.length)];
            db[userId].balance += amount;
            resultMessage = `⚔️ **ออกล่าสำเร็จ!** ${hasSword ? '*(พลังแห่งดาบอัศวินช่วยเพิ่มโอกาสชนะ! ⚔️)*\n>' : '\n>'} ${scenario}\n🎉 ได้รับเงิน **${amount} ฟรุ้งฟริ้ง!** (ยอดรวม: ${db[userId].balance})`;
        } else {
            const scenario = loseScenarios[Math.floor(Math.random() * loseScenarios.length)];
            db[userId].balance = Math.max(0, db[userId].balance - amount);
            resultMessage = `💀 **ภารกิจล้มเหลว!**\n> ${scenario}\n💸 เสียเงินไป **${amount} ฟรุ้งฟริ้ง!** (ยอดคงเหลือ: ${db[userId].balance})`;
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
        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!target) return message.reply('❌ คุณต้องแท็กเพื่อนที่ต้องการโอนเงินให้ด้วย (เช่น `!pay @ชื่อเพื่อน 100`)');
        if (target.id === userId) return message.reply('❌ โอนเงินให้ตัวเองไม่ได้เว้ย!');
        if (!amount || amount <= 0 || isNaN(amount)) return message.reply('❌ ใส่จำนวนเงินที่ถูกต้องด้วย');
        if (db[userId].balance < amount) return message.reply('💸 ฟรุ้งฟริ้งไม่พอ! ไปทำงานหาเงินก่อนไป');

        if (!db[target.id]) db[target.id] = { balance: 0, lastDaily: 0, lastHunt: 0, lastBossAttack: 0, inventory: { amulet: 0, sword: 0 } };

        db[userId].balance -= amount;
        db[target.id].balance += amount;
        saveDB(db);

        return message.reply(`💸 **${message.author.username}** ได้โอนเงิน **${amount} ฟรุ้งฟริ้ง** ให้กับ **${target.username}** เรียบร้อยแล้ว!`);
    }

    if (command === '!rob') {
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ จะปล้นใคร แท็กชื่อด้วย! (เช่น `!rob @ชื่อเพื่อน`)');
        if (target.id === userId) return message.reply('❌ บ้าไปแล้ว ปล้นตัวเองทำไม!');

        if (!db[target.id]) db[target.id] = { balance: 0, lastDaily: 0, lastHunt: 0, lastBossAttack: 0, inventory: { amulet: 0, sword: 0 } };
        if (db[target.id].balance < 100) return message.reply('❌ เป้าหมายจนเกินไป ปล้นไปก็ไม่ได้อะไร ปล่อยเขาไปเถอะ...');
        if (db[userId].balance < 50) return message.reply('❌ คุณต้องมีฟรุ้งฟริ้งติดตัวอย่างน้อย 50 เพื่อเป็นค่าปรับเผื่อโดนจับได้!');

        // เช็คว่าเป้าหมายมี "ยันต์ป้องกันภัย" (amulet) หรือไม่
        const targetAmulet = db[target.id].inventory?.amulet || 0;
        if (targetAmulet > 0) {
            // ทำลายยันต์ของเป้าหมาย 1 ชิ้น และผู้ปล้นทำไม่สำเร็จ
            db[target.id].inventory.amulet -= 1;

            // ผู้ปล้นโดนยันต์สะท้อน เสียค่าปรับเล็กน้อย 50 ฟรุ้งฟริ้ง
            const penalty = 50;
            db[userId].balance -= penalty;
            saveDB(db);

            const amuletEmbed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle('🛡️ ยันต์ป้องกันภัยทำงาน!')
                .setDescription(`⚡ **${message.author.username}** พยายามจะเข้าไปปล้น **${target.username}** แต่เจอยันต์ศักดิ์สิทธิ์เปล่งแสงทำลายโอกาสปล้น!\n\n> 🛡️ ยันต์ของ **${target.username}** ถูกสลายไป 1 ชิ้น\n> 💥 **${message.author.username}** โดนพลังยันต์สะท้อนกลับ เสียค่าปรับ **${penalty} ฟรุ้งฟริ้ง!**`);

            return message.reply({ embeds: [amuletEmbed] });
        }

        const chance = Math.random();

        if (chance > 0.6) {
            const percentWin = Math.floor(Math.random() * (95 - 20 + 1)) + 20;
            const stolenAmount = Math.floor((db[target.id].balance * percentWin) / 100);

            db[target.id].balance -= stolenAmount;
            db[userId].balance += stolenAmount;
            saveDB(db);

            return message.reply(`🥷 **สำเร็จ!** คุณแอบขโมยถุงเงินของ ${target.username} มาได้ **${stolenAmount} ฟรุ้งฟริ้ง!** (${percentWin}% ของเป้าหมาย) 🏃‍♂️💨`);
        } else {
            const percentLose = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
            const lostAmount = Math.floor((db[userId].balance * percentLose) / 100);

            db[userId].balance -= lostAmount;
            saveDB(db);

            return message.reply(`🚨 **โดนจับได้!** ยามหน้าประตูเมืองจับคุณขังคุก โดนยึดค่าปรับไป **${lostAmount} ฟรุ้งฟริ้ง** (${percentLose}% ของเงินคุณ) สมน้ำหน้า! 😂`);
        }
    }

    // ==========================================
    // 🛒 1. ระบบร้านค้าและกระเป๋าเก็บของ (!shop, !buy, !inv)
    // ==========================================
    if (command === '!shop' || command === '!ร้านค้า') {
        const shopEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🛒 ร้านค้าสมาคมนักผจญภัย')
            .setDescription('เลือกซื้อไอเทมเพื่อช่วยเหลือในการเดินทางได้ที่นี่!\nพิมพ์ `!buy <ชื่อไอเทม>` เพื่อทำการซื้อ')
            .addFields(
                { name: '🛡️ ยันต์ป้องกันภัย (`amulet`)', value: '💰 **ราคา:** 1,500 ฟรุ้งฟริ้ง\n✨ **ความสามารถ:** ป้องกันการถูกปล้น (`!rob`) ได้ 1 ครั้งแบบอัตโนมัติ', inline: false },
                { name: '⚔️ ดาบอัศวินฝึกหัด (`sword`)', value: '💰 **ราคา:** 3,000 ฟรุ้งฟริ้ง\n✨ **ความสามารถ:** เพิ่มอัตราการชนะเมื่อออกล่า (`!hunt`) เป็น **65%** ถาวร (มีได้ 1 เล่ม)', inline: false }
            )
            .setFooter({ text: 'พิมพ์ !buy amulet หรือ !buy sword เพื่อสั่งซื้อ' });

        return message.reply({ embeds: [shopEmbed] });
    }

    if (command === '!buy' || command === '!ซื้อ') {
        const item = args[0]?.toLowerCase();
        if (!item) return message.reply('❌ กรุณาระบุชื่อไอเทมที่ต้องการซื้อ (เช่น `!buy amulet` หรือ `!buy sword`)');

        if (item === 'amulet' || item === 'ยันต์') {
            const price = 1500;
            if (db[userId].balance < price) return message.reply(`💸 เงินไม่พอ! ยันต์ป้องกันภัยราคา **${price} ฟรุ้งฟริ้ง**`);

            db[userId].balance -= price;
            db[userId].inventory.amulet = (db[userId].inventory.amulet || 0) + 1;
            saveDB(db);

            return message.reply(`🎉 สั่งซื้อ **🛡️ ยันต์ป้องกันภัย** สำเร็จ! ตอนนี้คุณมีทั้งหมด **${db[userId].inventory.amulet} ชิ้น** (คงเหลือ: ${db[userId].balance} ฟรุ้งฟริ้ง)`);
        } else if (item === 'sword' || item === 'ดาบ') {
            const price = 3000;
            if ((db[userId].inventory.sword || 0) > 0) return message.reply('❌ คุณมีดาบอัศวินอยู่แล้ว! (ครอบครองได้สูงสุด 1 เล่ม)');
            if (db[userId].balance < price) return message.reply(`💸 เงินไม่พอ! ดาบอัศวินราคา **${price} ฟรุ้งฟริ้ง**`);

            db[userId].balance -= price;
            db[userId].inventory.sword = 1;
            saveDB(db);

            return message.reply(`🎉 สั่งซื้อ **⚔️ ดาบอัศวินฝึกหัด** สำเร็จ! ตอนนี้โอกาสชนะล่ามอนสเตอร์ของคุณเพิ่มเป็น **65%** แล้ว! (คงเหลือ: ${db[userId].balance} ฟรุ้งฟริ้ง)`);
        } else {
            return message.reply('❌ ไม่พบไอเทมนี้ในร้านค้า! พิมพ์ `!shop` เพื่อดูรายการไอเทมที่มีขาย');
        }
    }

    if (command === '!inv' || command === '!bag' || command === '!กระเป๋า') {
        const amuletCount = db[userId].inventory?.amulet || 0;
        const hasSword = (db[userId].inventory?.sword || 0) > 0;

        const invEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle(`🎒 กระเป๋าเดินทางของ ${message.author.username}`)
            .setDescription(`💰 **ยอดเงินคงเหลือ:** ${db[userId].balance} ฟรุ้งฟริ้ง`)
            .addFields(
                { name: '🛡️ ยันต์ป้องกันภัย', value: `${amuletCount} ชิ้น`, inline: true },
                { name: '⚔️ ดาบอัศวินฝึกหัด', value: hasSword ? '✅ ครอบครองแล้ว (โอกาสล่าชนะ +15%)' : '❌ ยังไม่มี', inline: true }
            )
            .setThumbnail(message.author.displayAvatarURL());

        return message.reply({ embeds: [invEmbed] });
    }

    // ==========================================
    // 🏆 2. ระบบตารางอันดับเศรษฐี (!rich หรือ !leaderboard)
    // ==========================================
    if (command === '!rich' || command === '!leaderboard' || command === '!อันดับ') {
        // ดึงเฉพาะ ID ผู้เล่น (ตัด 'boss' ออก)
        const userIds = Object.keys(db).filter(id => id !== 'boss');

        // เรียงลำดับจาก balance มากไปน้อย
        userIds.sort((a, b) => db[b].balance - db[a].balance);

        const top10 = userIds.slice(0, 10);
        let leaderboardText = "";

        const medals = ['🥇', '🥈', '🥉'];

        for (let i = 0; i < top10.length; i++) {
            const id = top10[i];
            const medal = medals[i] || `**${i + 1}.**`;
            leaderboardText += `${medal} <@${id}> - **${db[id].balance.toLocaleString()}** ฟรุ้งฟริ้ง\n`;
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
        const boss = db['boss'];

        // สร้างแถบ HP สวยๆ (10 หลอด)
        const percentage = Math.max(0, boss.hp / boss.maxHp);
        const filled = Math.round(percentage * 10);
        const empty = 10 - filled;
        const hpBar = '🟩'.repeat(filled) + '⬛'.repeat(empty);

        // ดึงรายชื่อคนทำดาเมจสูงสุด 5 อันดับ
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
        const boss = db['boss'];
        if (boss.hp <= 0) return message.reply('☠️ บอสเพิ่งพ่ายแพ้ไป! กำลังรอระบบเกิดบอสตัวใหม่...');

        const cooldown = 5 * 60 * 1000; // 5 นาที
        const timeNow = Date.now();
        const lastAttack = db[userId].lastBossAttack || 0;

        if (timeNow - lastAttack < cooldown) {
            const timeLeftSec = Math.ceil((cooldown - (timeNow - lastAttack)) / 1000);
            const mins = Math.floor(timeLeftSec / 60);
            const secs = timeLeftSec % 60;
            return message.reply(`⏳ พักเหนื่อยจากการร่ายเวท! รอคูลดาวน์อีก **${mins} นาที ${secs} วินาที** ค่อยตีใหม่`);
        }

        // คำนวณดาเมจที่ทำได้ (สุ่ม 80 - 250 DMG)
        const hasSword = (db[userId].inventory?.sword || 0) > 0;
        let damage = Math.floor(Math.random() * (250 - 80 + 1)) + 80;
        if (hasSword) damage += 50; // โบนัสดาเมจจากดาบ

        const isCritical = Math.random() < 0.2;
        if (isCritical) damage = Math.floor(damage * 1.5);

        // ลด HP บอส
        boss.hp = Math.max(0, boss.hp - damage);
        if (!boss.damages) boss.damages = {};
        boss.damages[userId] = (boss.damages[userId] || 0) + damage;
        db[userId].lastBossAttack = timeNow;

        let attackResultMsg = `💥 **${message.author.username}** ง้างอาวุธโจมตีใส่ ${boss.name}!\n> ${isCritical ? '💥 **CRITICAL HIT!!** ' : ''}สร้างความเสียหาย **${damage} DMG!** ${hasSword ? '(+50 จากดาบอัศวิน)' : ''}\n> HP บอสเหลือ: **${boss.hp.toLocaleString()} / ${boss.maxHp.toLocaleString()}**`;

        // หากบอสพ่ายแพ้จากการโจมตีครั้งนี้!
        if (boss.hp <= 0) {
            attackResultMsg += `\n\n🎉🎉 **บอสถูกพิชิตแล้ว!!** 🎉🎉\n⚔️ **${message.author.username}** ได้รับโบนัส **Last Hit 1,500 ฟรุ้งฟริ้ง!**`;

            // จ่ายโบนัส Last Hit
            db[userId].balance += 1500;

            // คำนวณแจกจ่ายรางวัลตามสัดส่วนดาเมจ
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

            // รีเซ็ตบอสตัวใหม่
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
});

client.login(TOKEN);