export default {
  registry: 'quests',
  label: 'Nhiệm vụ',
  icon: '📋',
  idField: 'id',
  fields: [
    { key: 'id', label: 'Mã (id)', type: 'text', required: true, immutable: true },
    { key: 'name', label: 'Tên nhiệm vụ', type: 'text', required: true },
    { key: 'description', label: 'Mô tả', type: 'textarea' },
    { key: 'rewardCoin', label: 'Thưởng 🌻', type: 'number', min: 0 },
    { key: 'rewardGem', label: 'Thưởng 🍯', type: 'number', min: 0 },
    { key: 'disabled', label: 'Tạm khoá', type: 'boolean' },
  ],
};
