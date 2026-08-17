// เอาชื่อที่โชว์ในเซิร์ฟเวอร์ (nickname ถ้ามี ไม่งั้น fallback เป็น username) ของคนที่กำลังใช้คำสั่งอยู่
// message.member (พิมพ์คำสั่ง) และ interaction.member (กดปุ่ม/select/modal) มีข้อมูลนี้ให้แบบ sync อยู่แล้ว ไม่ต้อง fetch
function getActorName(ctx) {
    return ctx.member?.displayName || ctx.author.username;
}

// เอาชื่อในเซิร์ฟเวอร์ของผู้เล่นที่ถูกแท็ก/เลือกมาโดยตรง (!pay, !rob) มี GuildMember ให้ใช้แบบ sync อยู่แล้วเช่นกัน
function getTargetName(ctx, targetUser) {
    return ctx.mentions.members?.first()?.displayName || targetUser.username;
}

// เอาชื่อในเซิร์ฟเวอร์จาก userId ล้วนๆ (ตารางอันดับ/ดาเมจตีบอส) ไม่มี object ให้ใช้ตรงๆ เลยต้อง fetch จาก guild
async function resolveDisplayName(guild, userId) {
    if (!guild) return `ผู้เล่น (${userId.slice(-4)})`;

    const cached = guild.members.cache.get(userId);
    if (cached) return cached.displayName;

    const fetched = await guild.members.fetch(userId).catch(() => null);
    if (fetched) return fetched.displayName;

    return `อดีตผู้เล่น (${userId.slice(-4)})`;
}

module.exports = { getActorName, getTargetName, resolveDisplayName };
