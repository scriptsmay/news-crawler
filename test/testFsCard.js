require('dotenv').config(); // 这行要加在最顶部

const { FeishuMsg, sendFeishuMsg, markdownToFeishuMsg, FeishuCard } = require('../src/service/feishu-card');

const FS_URL = `https://open.feishu.cn/open-apis/bot/v2/hook/${process.env.FS_KEY}`;
// 示例1: 直接创建消息
async function example1() {
  const msg = new FeishuMsg({
    title: '新闻推送',
    markdown: {
      总新闻数: '30条',
      更新时间: new Date().toLocaleString('zh-CN'),
      数据来源: '36氪',
    },
    note: '点击查看完整内容',
    noteEmoji: true,
    link: 'https://example.com',
    headerColor: FeishuCard.Colors.BLUE,
  });

  try {
    const result = await sendFeishuMsg(FS_URL, msg);
    console.log('消息发送成功:', result);
  } catch (error) {
    console.error('消息发送失败:', error.message);
  }
}

// 示例2: 从 Markdown 转换
async function example2() {
  const markdownContent = `
# 今日新闻

**总新闻数**：30条
**更新时间**：2025-11-14 15:30:25
**数据来源**：36氪

## 要闻摘要
1. [新闻标题1](链接1)
2. [新闻标题2](链接2)
  `;

  const msg = markdownToFeishuMsg('📰 今日新闻摘要', markdownContent, {
    note: '新闻推送',
    noteEmoji: true,
    link: 'https://example.com',
    headerColor: FeishuCard.Colors.GREEN,
  });

  try {
    const result = await sendFeishuMsg(FS_URL, msg);
    console.log('消息发送成功:', result);
  } catch (error) {
    console.error('消息发送失败:', error.message);
  }
}

// 运行示例
example1();
example2();
