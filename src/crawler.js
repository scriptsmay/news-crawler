const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const notifier = require('./notifier'); // 修正导入方式

class NewsCrawler {
  constructor() {
    this.outputDir = path.join(__dirname, '..', 'output');
    this.ensureOutputDir();
  }

  // 确保输出目录存在
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  // 获取当前日期
  getCurrentDate() {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  // 获取格式化时间
  getFormattedTime() {
    const now = new Date();
    return now.toLocaleString('zh-CN');
  }

  // 检查文件是否存在
  async checkFileExists() {
    const currentDate = this.getCurrentDate();
    const outputFile = path.join(this.outputDir, `tophub_news_${currentDate}.md`);
    return await fs.pathExists(outputFile);
  }

  // 读取现有文件内容
  async readExistingFile() {
    const currentDate = this.getCurrentDate();
    const outputFile = path.join(this.outputDir, `tophub_news_${currentDate}.md`);

    try {
      const content = await fs.readFile(outputFile, 'utf8');
      console.log(`发现现有文件: ${path.basename(outputFile)}`);
      return content;
    } catch (error) {
      console.error('读取现有文件失败:', error.message);
      return null;
    }
  }

  // 格式化通知内容（避免内容过长）
  formatNotificationContent(content, maxLength = 4000) {
    if (content.length <= maxLength) {
      return content;
    }

    // 截取内容并添加提示
    const truncatedContent = content.substring(0, maxLength - 100);
    return truncatedContent + '\n\n---\n*消息内容过长，已截断部分内容，完整内容请查看文件*';
  }

  // 从文件内容中提取统计信息
  extractStatsFromContent(content) {
    const lines = content.split('\n');
    let totalCount = 0;
    const categories = {};
    let currentCategory = '';

    for (const line of lines) {
      // 提取总新闻数量
      if (line.includes('总新闻数量:')) {
        const match = line.match(/总新闻数量:\s*(\d+)/);
        if (match) {
          totalCount = parseInt(match[1]);
        }
      }

      // 提取分类信息
      else if (line.startsWith('## ')) {
        currentCategory = line.replace('## ', '').trim();
        categories[currentCategory] = 0;
      }

      // 统计每个分类的新闻数量
      else if (line.startsWith('- [') && currentCategory) {
        categories[currentCategory] = (categories[currentCategory] || 0) + 1;
      }
    }

    // 过滤出有新闻的分类
    const validCategories = Object.entries(categories)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => `${category}: ${count}条`);

    return {
      totalCount,
      categorySummary: validCategories.join(', '),
    };
  }

  // 分类新闻
  categorizeNews(newsItems) {
    const categories = {
      经济与政策: ['经济', '政策', '央行', '统计局', '金融', '消费', '房地产', 'GDP', '投资'],
      科技创新: ['AI', '科技', '研发', '机器人', '模型', '智能', '创新', '发布', '产品'],
      资本市场: ['A股', '恒指', '融资', '基金', '投资', '股市', '成交额', '涨停', '跌'],
      企业动态: ['公司', '股份', '成立', '融资', '产品', '旗下', '完成', '获'],
      国际新闻: ['韩国', '英国', '美国', '国际', '全球', '海外', '欧盟'],
      其他新闻: ['.'], // 匹配所有
    };

    const categorized = {};

    for (const [category, keywords] of Object.entries(categories)) {
      categorized[category] = newsItems.filter((item) => {
        if (category === '其他新闻') return true;

        const title = item.title || '';
        const description = item.description || '';
        const text = (title + description).toLowerCase();

        return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
      });
    }

    return categorized;
  }

  // 生成Markdown内容
  generateMarkdown(categorizedNews, totalCount) {
    const currentDate = this.getCurrentDate();
    const formattedTime = this.getFormattedTime();

    let markdown = `# ${currentDate} 新闻列表\n\n`;
    markdown += `更新时间: ${formattedTime}\n\n`;

    // 按类别生成内容
    for (const [category, items] of Object.entries(categorizedNews)) {
      if (items.length === 0) continue;

      markdown += `## ${category}\n\n`;

      items.forEach((item) => {
        const title = item.title || '无标题';
        const url = item.url || '#';
        const description = item.description || '';
        const extra = item.extra ? ` | ${item.extra}` : '';
        const time = item.time ? ` | 时间: ${item.time}` : '';

        markdown += `- [${title}](${url}) - ${description}${extra}${time}\n`;
      });

      markdown += '\n';
    }

    // 统计信息
    markdown += `## 统计信息\n\n`;
    markdown += `- 总新闻数量: ${totalCount} 条\n`;
    markdown += `- 数据来源: 36氪\n`;
    markdown += `- 生成时间: ${formattedTime}\n`;

    return markdown;
  }

  // 获取新闻数据
  async fetchNews() {
    const currentDate = this.getCurrentDate();

    const data = new URLSearchParams({
      p: '1',
      date: currentDate,
      nodeid: '345',
    });

    const config = {
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8,zh-TW;q=0.7',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Cookie:
          'Hm_lvt_3b1e939f6e789219d8629de8a519eab9=1762620090,1762742825,1763092023; Hm_lpvt_3b1e939f6e789219d8629de8a519eab9=1763092023; HMACCOUNT=7BD59C2AA86EA232',
        DNT: '1',
        Origin: 'https://tophub.today',
        Pragma: 'no-cache',
        Referer: 'https://tophub.today/n/KqndgapoLl',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
      },
      timeout: 10000,
    };

    try {
      console.log('正在获取新闻数据...');
      const response = await axios.post('https://tophub.today/node-items-by-date', data.toString(), config);

      if (response.data && response.data.status === 200) {
        return response.data.data.items || [];
      } else {
        throw new Error('API返回数据格式错误');
      }
    } catch (error) {
      console.error('获取新闻数据失败:', error.message);
      throw error;
    }
  }

  // 发送现有文件内容作为通知
  async sendExistingFileNotification() {
    try {
      const currentDate = this.getCurrentDate();
      const fileContent = await this.readExistingFile();

      if (!fileContent) {
        throw new Error('无法读取现有文件内容');
      }

      // 提取统计信息
      const stats = this.extractStatsFromContent(fileContent);

      // 格式化通知内容
      const notificationContent = this.formatNotificationContent(fileContent);

      console.log(`使用现有文件发送通知 - 总数: ${stats.totalCount}条, 分类: ${stats.categorySummary}`);

      // 发送通知
      await notifier.notify(`📰 今日新闻 - ${currentDate}`, notificationContent, true);

      console.log('✅ 已使用现有文件发送通知');
      return true;
    } catch (error) {
      console.error('发送现有文件通知失败:', error.message);
      return false;
    }
  }

  // 主执行函数
  async run() {
    try {
      const currentDate = this.getCurrentDate();
      const fileExists = await this.checkFileExists();

      // 如果文件已存在，直接发送通知并退出
      if (fileExists) {
        console.log(`今日新闻文件已存在: tophub_news_${currentDate}.md`);
        const success = await this.sendExistingFileNotification();
        if (success) {
          console.log('任务完成! (使用现有文件)');
          return;
        } else {
          console.log('使用现有文件失败，继续执行抓取...');
        }
      }

      // 获取新闻数据
      const newsItems = await this.fetchNews();

      if (!newsItems || newsItems.length === 0) {
        throw new Error('未获取到新闻数据');
      }

      console.log(`成功获取 ${newsItems.length} 条新闻`);

      // 分类新闻
      const categorizedNews = this.categorizeNews(newsItems);

      // 生成Markdown
      const markdownContent = this.generateMarkdown(categorizedNews, newsItems.length);

      // 保存到文件
      const outputFile = path.join(this.outputDir, `tophub_news_${currentDate}.md`);
      await fs.writeFile(outputFile, markdownContent, 'utf8');
      console.log(`新闻数据已保存到: ${path.basename(outputFile)}`);

      // 发送通知
      const categorySummary = Object.entries(categorizedNews)
        .filter(([_, items]) => items.length > 0)
        .map(([category, items]) => `${category}: ${items.length}条`)
        .join(', ');

      console.log(`统计信息 - 总数: ${newsItems.length}条, 分类: ${categorySummary}`);

      const notificationContent = this.formatNotificationContent(markdownContent);
      await notifier.notify(`📰 今日新闻 - ${currentDate}`, notificationContent, true);

      console.log('任务完成! (新抓取数据)');
    } catch (error) {
      console.error('脚本执行失败:', error.message);

      // 发送错误通知
      await notifier.notify('❌ 新闻爬取失败', `错误信息: ${error.message}\n时间: ${this.getFormattedTime()}`, true);

      process.exit(1);
    }
  }
}

// 执行脚本
if (require.main === module) {
  const crawler = new NewsCrawler();
  crawler.run();
}

module.exports = NewsCrawler;
