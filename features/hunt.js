const { EmbedBuilder } = require('discord.js');
const { saveDB, isInJail } = require('./db');
const { getWeaponLevel } = require('./weapons');

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

// ==========================================
// ⚔️ ออกล่ามอนสเตอร์ (!hunt หรือ !ล่า)
// ==========================================
module.exports = {
    commands: ['!hunt', '!ล่า'],
    execute(message, args, command, db) {
        const userId = message.author.id;

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
};
