// Văn bản luận giải dự phòng khi AI_PROXY_URL trống hoặc lỗi mạng.
export function buildFallbackReading(card, orientation) {
  const meaning = orientation === 'reversed' ? card.reversed : card.upright;
  const openings = [
    'Hôm nay lá bài dành cho bạn là',
    'Ong rút được lá bài này dành riêng cho bạn:',
    'Vũ trụ nhỏ của Ong gửi đến bạn lá bài',
  ];
  const opening = openings[Math.floor(Math.random() * openings.length)];
  const orientationLabel = orientation === 'reversed' ? 'ngược' : 'xuôi';
  return `${opening} "${card.name}" (${orientationLabel}). ${meaning}`;
}

export async function fetchReading({ card, orientation, aiProxyUrl }) {
  if (aiProxyUrl) {
    try {
      const res = await fetch(aiProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'tarot', cardId: card.id, cardName: card.name, orientation }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.text) return data.text;
      }
    } catch {
      // rơi xuống văn bản dự phòng bên dưới
    }
  }
  return buildFallbackReading(card, orientation);
}
