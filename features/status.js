const { EmbedBuilder } = require('discord.js');

// ==========================================
// 📊 ระบบสุ่มสเตตัส (!status หรือ !สเตตัส)
// ==========================================
module.exports = {
    commands: ['!status', '!สเตตัส'],
    execute(message) {
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
};
