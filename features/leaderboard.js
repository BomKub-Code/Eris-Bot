const { EmbedBuilder } = require('discord.js');

// ==========================================
// 🏆 ระบบตารางอันดับเศรษฐี (!rich หรือ !leaderboard)
// ==========================================
module.exports = {
    commands: ['!rich', '!leaderboard', '!อันดับ'],
    execute(message, args, command, db) {
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
};
