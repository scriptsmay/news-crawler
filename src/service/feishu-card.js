const axios = require('axios');

/**
 * 飞书消息卡片生成器
 * 飞书消息卡片结构文档 https://open.feishu.cn/document/uAjLw4CM/ukzMukzMukzM/feishu-cards/card-json-structure
 * 卡片搭建工具 https://open.feishu.cn/cardkit
 */

class FeishuCard {
  /**
   * 飞书颜色模板
   */
  static Colors = {
    BLUE: 'blue',
    WATHET: 'wathet',
    TURQUOISE: 'turquoise',
    GREEN: 'green',
    YELLOW: 'yellow',
    ORANGE: 'orange',
    RED: 'red',
    CARMINE: 'carmine',
    VIOLET: 'violet',
    GREY: 'grey',
    DEFAULT: 'default',
  };

  /**
   * 随机表情符号
   */
  static Emojis = [
    '👍',
    '👏',
    '👌',
    '👊',
    '✌',
    '👋',
    '👆',
    '👇',
    '👈',
    '👉',
    '👎',
    '👓',
    '👔',
    '👕',
    '👖',
    '👗',
    '👘',
    '👙',
    '👚',
    '👛',
    '👜',
    '👝',
    '👞',
    '👟',
    '👠',
    '👡',
    '👢',
    '👣',
    '👤',
    '👥',
    '👦',
    '👧',
    '👨',
    '👩',
    '👪',
    '👫',
    '👬',
    '👭',
    '👮',
    '👯',
    '👰',
    '👱',
    '👲',
    '👳',
    '👴',
    '👵',
    '👶',
    '👷',
    '👸',
    '👹',
    '👺',
    '👻',
    '👼',
    '👽',
    '👾',
    '👿',
    '💀',
    '💁',
    '💂',
    '💃',
    '💄',
    '💅',
    '💆',
    '💇',
    '💈',
    '💉',
    '💊',
    '💋',
    '💌',
    '💍',
    '💎',
    '💏',
    '💐',
    '💑',
    '💒',
    '💓',
    '💔',
    '💕',
    '💖',
    '💗',
    '💘',
    '💙',
    '💚',
    '💛',
    '💜',
    '💝',
    '💞',
    '💟',
    '💠',
    '💡',
    '💢',
    '💣',
    '💤',
    '💥',
    '💦',
    '💧',
    '💨',
    '💩',
    '💪',
    '💫',
  ];

  /**
   * 构建 Markdown 元素
   * @param {string} content - Markdown 内容
   * @param {string} align - 对齐方式 (left/center/right)
   * @returns {Object}
   */
  static createMarkdownElement(content, align = 'left') {
    return {
      tag: 'markdown',
      text_align: align,
      content: content,
    };
  }

  /**
   * 构建居中 Markdown 元素
   * @param {string} content - Markdown 内容
   * @returns {Object}
   */
  static createMarkdownCenterElement(content) {
    return this.createMarkdownElement(content, 'center');
  }

  /**
   * 构建纯文本元素
   * @param {string} content - 文本内容
   * @returns {Object}
   */
  static createTextElement(content) {
    return {
      tag: 'plain_text',
      content: content,
    };
  }

  /**
   * 构建备注元素
   * @param {string} content - 备注内容
   * @returns {Object}
   */
  static createNoteElement(content) {
    return {
      tag: 'note',
      elements: [this.createTextElement(content)],
    };
  }

  /**
   * 构建列元素
   * @param {string} align - 垂直对齐方式
   * @param {string} content - 内容
   * @param {boolean} center - 是否居中
   * @returns {Object}
   */
  static createColumn(align = 'top', content = '', center = false) {
    const element = center ? this.createMarkdownCenterElement(content) : this.createMarkdownElement(content);

    return {
      tag: 'column',
      width: 'weighted',
      weight: 1,
      vertical_align: align,
      elements: [element],
    };
  }

  /**
   * 构建居中列元素
   * @param {string} align - 垂直对齐方式
   * @param {string} content - 内容
   * @returns {Object}
   */
  static createCenterColumn(align = 'top', content = '') {
    return this.createColumn(align, content, true);
  }

  /**
   * 构建分割线元素
   * @returns {Object}
   */
  static createHr() {
    return {
      tag: 'hr',
    };
  }

  /**
   * 构建按钮元素
   * @param {string} text - 按钮文本
   * @param {string} url - 按钮链接
   * @param {string} type - 按钮类型
   * @returns {Object}
   */
  static createButton(text, url, type = 'default') {
    return {
      tag: 'button',
      text: this.createTextElement(text),
      url: url,
      type: type,
    };
  }

  /**
   * 构建带链接的 Markdown 元素
   * @param {string} title - 标题
   * @param {string} url - 链接
   * @returns {string}
   */
  static createLinkedMarkdown(title, url) {
    return `[${title}](${url})`;
  }
}

/**
 * 飞书消息类
 */
class FeishuMsg {
  constructor(options = {}) {
    this.title = options.title || '';
    this.markdown = options.markdown || {};
    this.note = options.note || '';
    this.noteEmoji = options.noteEmoji !== false;
    this.link = options.link || '';
    this.headerColor = options.headerColor || FeishuCard.Colors.DEFAULT;
    this.response = null;
  }

  /**
   * 构建 Markdown 内容
   * @returns {string}
   */
  buildMarkdownContent() {
    if (Object.keys(this.markdown).length === 0) {
      return '';
    }

    let md = '';
    for (const [key, value] of Object.entries(this.markdown)) {
      // 直接使用键值对，不额外添加 **
      md += `${key}：${value}\n`;
    }
    return md;
  }

  /**
   * 构建备注内容
   * @returns {string}
   */
  buildNoteContent() {
    let note = this.note;
    if (!note) {
      note = new Date().toLocaleString('zh-CN');
    }

    if (this.noteEmoji) {
      const randomIndex = Math.floor(Math.random() * FeishuCard.Emojis.length);
      const emoji = FeishuCard.Emojis[randomIndex];
      note = `${emoji} ${note} ${emoji}`;
    }

    return note;
  }

  /**
   * 格式化消息
   * @returns {Object}
   */
  formatMsg() {
    const elements = [];

    // 添加 Markdown 内容
    const mdContent = this.buildMarkdownContent();
    if (mdContent) {
      elements.push(FeishuCard.createMarkdownElement(mdContent));
    }

    // 添加备注
    const noteContent = this.buildNoteContent();
    elements.push(FeishuCard.createNoteElement(noteContent));

    return {
      msg_type: 'interactive',
      card: {
        elements: elements,
        header: {
          title: FeishuCard.createTextElement(this.title),
          template: this.headerColor,
        },
        card_link: this.link ? { url: this.link } : undefined,
      },
    };
  }

  /**
   * 构建带链接的 Markdown 内容
   * @param {Array} newsItems - 新闻项目数组
   * @returns {string}
   */
  buildLinkedMarkdownContent(newsItems) {
    if (!newsItems || newsItems.length === 0) {
      return '';
    }

    let md = '';

    // 添加新闻标题和链接
    md += `**今日要闻**：\n`;

    // const displayItems = newsItems.slice(0, 5);
    newsItems.forEach((item, index) => {
      const title = item.title || '无标题';
      const url = item.url || '#';
      md += `${index + 1}. ${FeishuCard.createLinkedMarkdown(title, url)}\n`;
    });

    // if (newsItems.length > 5) {
    //   md += `\n... 还有 ${newsItems.length - 5} 条新闻`;
    // }

    return md;
  }

  /**
   * 格式化带链接的消息
   * @param {Array} newsItems - 新闻项目数组
   * @returns {Object}
   */
  formatLinkedMsg(newsItems) {
    const elements = [];

    // 添加带链接的 Markdown 内容
    const mdContent = this.buildLinkedMarkdownContent(newsItems);
    if (mdContent) {
      elements.push(FeishuCard.createMarkdownElement(mdContent));
    }

    // 添加备注
    const noteContent = this.buildNoteContent();
    elements.push(FeishuCard.createNoteElement(noteContent));

    return {
      msg_type: 'interactive',
      card: {
        elements: elements,
        header: {
          title: FeishuCard.createTextElement(this.title),
          template: this.headerColor,
        },
        card_link: this.link ? { url: this.link } : undefined,
      },
    };
  }
}

/**
 * 发送飞书消息
 * @param {string} hook - 飞书 Webhook URL
 * @param {FeishuMsg} feishuMsg - 飞书消息对象
 * @returns {Promise<Object>}
 */
async function sendFeishuMsg(hook, feishuMsg) {
  if (!hook) {
    throw new Error('飞书 Webhook URL 不能为空');
  }

  if (!(feishuMsg instanceof FeishuMsg)) {
    throw new Error('消息参数必须是 FeishuMsg 实例');
  }

  try {
    const message = feishuMsg.formatMsg();

    const response = await axios.post(hook, message, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    feishuMsg.response = response.data;
    return response.data;
  } catch (error) {
    throw new Error(`发送飞书消息失败: ${error.message}`);
  }
}

/**
 * 将 Markdown 转换为飞书消息
 * @param {string} title - 标题
 * @param {string} markdownContent - Markdown 内容
 * @param {Object} options - 额外选项
 * @returns {FeishuMsg}
 */
function markdownToFeishuMsg(title, markdownContent, options = {}) {
  const lines = markdownContent.split('\n').filter((line) => line.trim());
  const markdownData = {};

  for (const line of lines) {
    // 跳过标题行
    if (line.startsWith('#') || line.startsWith('##') || line.startsWith('###')) {
      continue;
    }

    // 跳过分割线
    if (line.startsWith('---') || line.startsWith('***') || line.startsWith('___')) {
      continue;
    }

    // 跳过统计信息标题
    if (line.includes('**统计信息**') || line.includes('统计信息')) {
      continue;
    }

    // 解析键值对
    if (line.includes('：') || line.includes(':')) {
      const separator = line.includes('：') ? '：' : ':';
      const [key, ...valueParts] = line.split(separator);
      const value = valueParts.join(separator).trim();

      if (key && value) {
        // 清理 Markdown 格式 - 移除所有的 ** 和链接格式
        const cleanKey = key
          .replace(/#+\s*/g, '')
          .replace(/\*\*/g, '')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
          .trim();

        const cleanValue = value
          .replace(/\*\*/g, '')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
          .trim();

        if (cleanKey && cleanValue && !cleanKey.startsWith('-')) {
          markdownData[cleanKey] = cleanValue;
        }
      }
    }

    // 处理列表项
    else if (line.startsWith('- ') || /^\d+\./.test(line)) {
      const cleanLine = line
        .replace(/^[-•*]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .trim();

      if (cleanLine) {
        const listKey = `项目${Object.keys(markdownData).length + 1}`;
        markdownData[listKey] = cleanLine;
      }
    }
  }

  return new FeishuMsg({
    title: title,
    markdown: markdownData,
    note: options.note,
    noteEmoji: options.noteEmoji,
    link: options.link,
    headerColor: options.headerColor || FeishuCard.Colors.BLUE,
  });
}

/**
 * 从新闻数据创建带链接的飞书消息
 * @param {string} title - 标题
 * @param {Array} newsItems - 新闻项目数组
 * @param {Object} options - 额外选项
 * @returns {FeishuMsg}
 */
function createFeishuMsgFromNews(title, newsItems, options = {}) {
  const msg = new FeishuMsg({
    title: title,
    note: options.note || '点击标题查看详情',
    noteEmoji: options.noteEmoji !== false,
    link: options.link,
    headerColor: options.headerColor || FeishuCard.Colors.BLUE,
  });

  // 保存新闻数据用于生成带链接的内容
  msg.newsItems = newsItems;

  // 重写 formatMsg 方法以使用带链接的格式
  msg.formatMsg = function () {
    return this.formatLinkedMsg(this.newsItems);
  };

  return msg;
}

/**
 * 创建简单的新闻列表消息（纯文本，无链接）
 * @param {string} title - 标题
 * @param {Array} newsItems - 新闻项目数组
 * @param {Object} options - 额外选项
 * @returns {FeishuMsg}
 */
function createSimpleNewsMsg(title, newsItems, options = {}) {
  const markdownData = {};

  // 添加统计信息
  markdownData['总新闻数'] = `${newsItems.length} 条`;
  markdownData['更新时间'] = new Date().toLocaleString('zh-CN');
  markdownData['数据来源'] = '36氪';

  // 添加新闻标题（最多显示5条）
  const displayItems = newsItems.slice(0, 5);
  displayItems.forEach((item, index) => {
    const newsTitle = item.title || '无标题';
    markdownData[`新闻${index + 1}`] = newsTitle;
  });

  if (newsItems.length > 5) {
    markdownData['提示'] = `... 还有 ${newsItems.length - 5} 条新闻`;
  }

  return new FeishuMsg({
    title: title,
    markdown: markdownData,
    note: options.note || '新闻推送',
    noteEmoji: options.noteEmoji !== false,
    link: options.link,
    headerColor: options.headerColor || FeishuCard.Colors.BLUE,
  });
}

module.exports = {
  FeishuCard,
  FeishuMsg,
  sendFeishuMsg,
  markdownToFeishuMsg,
  createFeishuMsgFromNews,
  createSimpleNewsMsg,
};
