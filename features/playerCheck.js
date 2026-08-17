// เช็คว่าสมาชิกคนนี้ "เป็นผู้เล่น" หรือไม่ โดยดูว่ามี Discord Role ติดตัวอยู่อย่างน้อย 1 อัน
// (นอกเหนือจาก @everyone ซึ่งทุกคนมีอยู่แล้วโดยอัตโนมัติ)
function isPlayerMember(member) {
    if (!member) return false;
    return member.roles.cache.some(role => role.id !== member.guild.id);
}

module.exports = { isPlayerMember };
