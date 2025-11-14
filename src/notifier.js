const axios = require('axios');

/**
 * 通知模块
 */
class Notifier {
  constructor() {
    // 初始化 Gotify 配置
    this.GOTIFY_URL = process.env['GOTIFY_URL'] || '';
    this.GOTIFY_TOKEN = process.env['GOTIFY_TOKEN'] || '';
    this.GOTIFY_PRIORITY = parseInt(process.env['GOTIFY_PRIORITY']) || 0;
    this.ENABLE_MARKDOWN = process.env['GOTIFY_MARKDOWN'] === 'true' || true; // 默认启用
  }

  /**
   * 发送通知
   * @param {string} title - 通知标题
   * @param {string} content - 通知内容
   * @param {boolean} useMarkdown - 是否使用Markdown格式
   */
  async notify(title, content, useMarkdown = null) {
    try {
      // 方法1: 如果是在青龙面板环境中，使用 QLAPI
      if (typeof QLAPI !== 'undefined' && QLAPI.notify) {
        QLAPI.notify(title, content);
        console.log('通知已通过 QLAPI 发送');
        return;
      }

      // 方法2: 使用 Gotify 通知
      const shouldUseMarkdown = useMarkdown !== null ? useMarkdown : this.ENABLE_MARKDOWN;
      await this.gotifyNotify(title, content, shouldUseMarkdown);
    } catch (error) {
      console.error('发送通知失败:', error.message);
      // 即使通知失败，也不影响主流程
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
      console.log('⚠️  Gotify 配置不完整，使用控制台输出');
      this.consoleNotify(title, message);
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
      this.consoleNotify(title, message);
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
}

module.exports = new Notifier();
