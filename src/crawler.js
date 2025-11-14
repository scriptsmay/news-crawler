const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const notifier = require('./notifier');

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

  // 从文件内容中提取标题和链接（简化版本）
  extractTitlesAndLinks(content, maxItems = 10) {
    const lines = content.split('\n');
    const items = [];

    for (const line of lines) {
      if (line.startsWith('- [')) {
        // 提取标题和链接
        const match = line.match(/^- \[(.*?)\]\((.*?)\)/);
        if (match) {
          const title = match[1];
          const url = match[2];
          items.push({ title, url });
        }

        // 达到最大数量时停止
        if (items.length >= maxItems) {
          break;
        }
      }
    }

    return items;
  }

  // 生成简化通知内容（只包含标题和链接）
  generateSimpleNotification(items) {
    let content = '';

    // 只显示标题和链接
    items.forEach((item, index) => {
      content += `${index + 1}. [${item.title}](${item.url})\n`;
    });

    content += `\n---\n`;

    return content;
  }

  // 从文件内容中提取统计信息
  extractStatsFromContent(content) {
    const lines = content.split('\n');
    let totalCount = 0;

    for (const line of lines) {
      // 提取总新闻数量
      if (line.includes('总新闻数量:')) {
        const match = line.match(/总新闻数量:\s*(\d+)/);
        if (match) {
          totalCount = parseInt(match[1]);
        }
        break;
      }
    }

    return {
      totalCount,
    };
  }

  // 生成Markdown内容（完整版本）
  generateMarkdown(newsItems) {
    const currentDate = this.getCurrentDate();
    const formattedTime = this.getFormattedTime();

    let markdown = `# ${currentDate} 新闻列表\n\n`;
    markdown += `更新时间: ${formattedTime}\n\n`;

    // 直接显示所有新闻（包含描述信息）
    newsItems.forEach((item) => {
      const title = item.title || '无标题';
      const url = item.url || '#';
      const description = item.description || '';
      const extra = item.extra ? ` | ${item.extra}` : '';
      const time = item.time ? ` | 时间: ${item.time}` : '';

      markdown += `- [${title}](${url}) - ${description}${extra}${time}\n`;
    });

    markdown += '\n';

    // 统计信息
    markdown += `## 统计信息\n\n`;
    markdown += `- 总新闻数量: ${newsItems.length} 条\n`;
    markdown += `- 数据来源: 36氪 <https://tophub.today> \n`;
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

  // 发送现有文件内容作为通知（简化版本）
  async sendExistingFileNotification() {
    try {
      const currentDate = this.getCurrentDate();
      const fileContent = await this.readExistingFile();

      if (!fileContent) {
        throw new Error('无法读取现有文件内容');
      }

      // 提取标题和链接
      const items = this.extractTitlesAndLinks(fileContent, 20);

      // 生成简化通知内容
      const simplifiedContent = this.generateSimpleNotification(items);

      console.log(`使用现有文件发送简化通知（${items.length}条新闻）`);

      // 发送通知
      await notifier.notify(`📰 今日新闻 - ${currentDate}`, simplifiedContent, true);
      await notifier.sendNewsNotification(`📰 今日新闻 - ${currentDate}`, items);

      console.log('✅ 已使用现有文件发送简化通知');
      return true;
    } catch (error) {
      console.error('发送现有文件通知失败:', error.message);
      return false;
    }
  }

  // 生成简化通知内容（新抓取数据用）
  generateSimpleNotificationFromItems(newsItems, maxItems = 10) {
    const currentDate = this.getCurrentDate();
    const formattedTime = this.getFormattedTime();

    let content = `# 📰 今日要闻 ${currentDate} \n\n`;
    content += `更新时间: ${formattedTime}\n\n`;

    // 只显示前几条新闻的标题和链接
    const displayItems = newsItems.slice(0, maxItems);

    displayItems.forEach((item, index) => {
      const title = item.title || '无标题';
      const url = item.url || '#';
      content += `${index + 1}. [${title}](${url})\n`;
    });

    content += `\n---\n`;

    return content;
  }

  // 主执行函数
  async run() {
    try {
      const currentDate = this.getCurrentDate();
      const fileExists = await this.checkFileExists();

      // 如果文件已存在，直接发送简化通知并退出
      if (fileExists) {
        console.log(`今日新闻文件已存在: tophub_news_${currentDate}.md`);
        const success = await this.sendExistingFileNotification();
        if (success) {
          console.log('任务完成! (使用现有文件发送简化通知)');
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

      // 生成完整Markdown并保存到文件
      const fullMarkdown = this.generateMarkdown(newsItems);
      const outputFile = path.join(this.outputDir, `tophub_news_${currentDate}.md`);
      await fs.writeFile(outputFile, fullMarkdown, 'utf8');
      console.log(`新闻数据已保存到: ${path.basename(outputFile)}`);

      // 生成简化通知内容（只包含标题和链接）
      const simplifiedContent = this.generateSimpleNotificationFromItems(newsItems, 20);

      // 发送通知
      console.log(`统计信息 - 总数: ${newsItems.length}条`);
      await notifier.notify(`📰 今日新闻 - ${currentDate}`, simplifiedContent, true);
      await notifier.sendNewsNotification(`📰 今日新闻 - ${currentDate}`, newsItems);

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
