const axios = require('axios');
const { sendFeishuMsg, createFeishuMsgFromNews, markdownToFeishuMsg, FeishuCard } = require('./service/feishu-card');

/**
 * 通知模块
 */
class Notifier {
  constructor() {
    // 初始化配置
    this.GOTIFY_URL = process.env['GOTIFY_URL'] || '';
    this.GOTIFY_TOKEN = process.env['GOTIFY_TOKEN'] || '';
    this.GOTIFY_PRIORITY = parseInt(process.env['GOTIFY_PRIORITY']) || 0;
    this.ENABLE_MARKDOWN = process.env['GOTIFY_MARKDOWN'] === 'true' || true;

    // 飞书配置
    this.FS_KEY = process.env['FS_KEY'] || '';
    this.FS_TIMEOUT = parseInt(process.env['FS_TIMEOUT']) || 10000;
  }

  /**
   * 发送通知
   * @param {string} title - 通知标题
   * @param {string} content - 通知内容
   * @param {boolean} useMarkdown - 是否使用Markdown格式（仅Gotify）
   */
  async notify(title, content, useMarkdown = null) {
    try {
      // 方法1: 如果是在青龙面板环境中，使用 QLAPI
      if (typeof QLAPI !== 'undefined' && QLAPI.notify) {
        QLAPI.notify(title, content);
        console.log('通知已通过 QLAPI 发送');
      }

      // 方法2: 使用飞书通知
      // await this.fsBotNotifyCard(title, content);

      // 方法3: 使用 Gotify 通知
      const shouldUseMarkdown = useMarkdown !== null ? useMarkdown : this.ENABLE_MARKDOWN;
      await this.gotifyNotify(title, content, shouldUseMarkdown);
    } catch (error) {
      console.error('发送通知失败:', error.message);
      // 即使通知失败，也不影响主流程
    }
  }

  /**
   * 飞书通知方法
   * @param {string} text - 通知标题
   * @param {string} desp - 通知内容
   */
  async fsBotNotify(text, desp) {
    // 检查配置是否完整
    if (!this.FS_KEY) {
      console.log('⚠️  飞书配置不完整，跳过飞书通知');
      return false;
    }

    try {
      const url = `https://open.feishu.cn/open-apis/bot/v2/hook/${this.FS_KEY}`;

      // 构建请求数据
      const data = {
        msg_type: 'text',
        content: {
          text: `${text}\n\n${desp}`,
        },
      };

      console.log('正在通过飞书发送通知...');

      const response = await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: this.FS_TIMEOUT,
      });

      // 处理响应
      if (response.data && response.data.code === 0) {
        console.log('✅ 飞书发送通知消息成功');
        return true;
      } else {
        console.log(`❌ 飞书发送通知失败: ${response.data?.msg || '未知错误'}`);
        return false;
      }
    } catch (error) {
      console.error('❌ 飞书发送通知调用 API 失败:', error.message);
      return false;
    }
  }

  /**
   * 飞书卡片通知方法
   * @param {string} title - 卡片标题
   * @param {string} content - 卡片内容
   */
  async fsBotNotifyCard(title, content) {
    if (!this.FS_KEY) {
      console.log('⚠️  飞书配置不完整，跳过飞书卡片通知');
      return false;
    }

    try {
      const hook = `https://open.feishu.cn/open-apis/bot/v2/hook/${this.FS_KEY}`;

      // 将内容转换为飞书卡片消息
      const msg = markdownToFeishuMsg(title, content, {
        note: '新闻推送',
        noteEmoji: true,
        headerColor: FeishuCard.Colors.BLUE,
      });

      console.log('正在通过飞书卡片发送通知...');

      await sendFeishuMsg(hook, msg);
      console.log('✅ 飞书卡片通知发送成功');
      return true;
    } catch (error) {
      console.error('❌ 飞书卡片通知发送失败:', error.message);
      return false;
    }
  }

  /**
   * 飞书新闻卡片通知（推荐使用这种方式，避免格式问题）
   * @param {String} title
   * @param {Array} newsItems
   * @returns
   */
  async sendNewsNotification(title, newsItems) {
    if (!this.FS_KEY) {
      console.log('⚠️  飞书配置不完整，跳过飞书卡片通知');
      return false;
    }
    const msg = createFeishuMsgFromNews(title, newsItems, {
      note: '今日推送',
      noteEmoji: true,
      headerColor: FeishuCard.Colors.GREEN,
    });

    try {
      const result = await sendFeishuMsg(`https://open.feishu.cn/open-apis/bot/v2/hook/${this.FS_KEY}`, msg);
      console.log('✅ 飞书卡片通知发送成功', result.msg);
    } catch (error) {
      console.error('发送失败:', error.message);
    }
  }

  /**
   * Gotify 通知方法
   * @param {string} title - 通知标题
   * @param {string} message - 通知内容
   * @param {boolean} useMarkdown - 是否使用Markdown格式
   */
  async gotifyNotify(title, message, useMarkdown = true) {
    // 检查配置是否完整
    if (!this.GOTIFY_URL || !this.GOTIFY_TOKEN) {
      console.log('⚠️  Gotify 配置不完整，跳过');
      // this.consoleNotify(title, message);
      return;
    }

    try {
      const url = `${this.GOTIFY_URL}/message`;

      // 构建请求数据
      const data = {
        title: title,
        message: message,
        priority: this.GOTIFY_PRIORITY,
      };

      // 如果启用 Markdown，添加 extras 配置
      if (useMarkdown) {
        data.extras = {
          'client::display': {
            contentType: 'text/markdown',
          },
        };
      }

      console.log(`正在通过 Gotify 发送通知... ${useMarkdown ? '(Markdown格式)' : '(纯文本格式)'}`);

      const response = await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json',
          'X-Gotify-Key': this.GOTIFY_TOKEN,
        },
        timeout: 10000,
      });

      // 处理响应
      if (response.data && response.data.id) {
        console.log('✅ Gotify 发送通知消息成功');
      } else {
        console.log(`❌ Gotify 发送通知失败: ${response.data?.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('❌ Gotify 发送通知调用 API 失败:', error.message);
      // 降级到控制台输出
      // this.consoleNotify(title, message);
    }
  }

  /**
   * 控制台通知（备用方案）
   * @param {string} title - 通知标题
   * @param {string} content - 通知内容
   */
  consoleNotify(title, content) {
    console.log('\n=== 通知 ===');
    console.log(`标题: ${title}`);
    console.log(`内容: ${content}`);
    console.log(`时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log('============\n');
  }

  /**
   * 检查通知配置状态
   */
  checkConfig() {
    console.log('=== 通知配置检查 ===');
    console.log('飞书配置:', this.FS_KEY ? '已设置' : '未设置');
    console.log('Gotify URL:', this.GOTIFY_URL ? '已设置' : '未设置');
    console.log('Gotify Token:', this.GOTIFY_TOKEN ? '已设置' : '未设置');
    console.log('==================\n');
  }
}

// 创建单例实例
const notifier = new Notifier();

module.exports = notifier;
