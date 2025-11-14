require('dotenv').config(); // 这行要加在最顶部

const fs = require('fs-extra');
const path = require('path');
const notifier = require('../src/notifier');

class TestNotifier {
  constructor() {
    this.outputDir = path.join(__dirname, '../output');
  }

  // 读取Markdown文件内容
  async readMarkdownFile(filename = 'tophub_news_2025-11-14.md') {
    const filePath = path.join(this.outputDir, filename);

    try {
      if (!(await fs.pathExists(filePath))) {
        throw new Error(`文件不存在: ${filePath}`);
      }

      const content = await fs.readFile(filePath, 'utf8');
      console.log(`成功读取文件: ${filename}`);
      return content;
    } catch (error) {
      console.error('读取文件失败:', error.message);
      throw error;
    }
  }

  // 发送测试通知
  async sendTestNotification() {
    try {
      console.log('开始测试通知功能...\n');

      // 1. 读取Markdown文件
      const content = await this.readMarkdownFile();

      // 4. 发送通知
      console.log('正在发送通知...');
      await notifier.notify('消息推送测试', content);

      console.log('✅ 测试通知发送完成！');
    } catch (error) {
      console.error('❌ 测试失败:', error.message);

      // 即使文件读取失败，也发送一个错误测试通知
      const errorTitle = '测试通知 - 错误情况';
      const errorContent = `❌ 测试过程中出现错误\n\n错误信息: ${error.message}\n测试时间: ${new Date().toLocaleString(
        'zh-CN'
      )}`;

      await notifier.notify(errorTitle, errorContent);
      console.log('✅ 错误测试通知已发送');
    }
  }

  // 发送简单测试通知（不依赖文件）
  async sendSimpleTest() {
    const testTitle = '简单测试通知';
    const testContent =
      `这是一个简单的测试通知\n\n` +
      `测试时间: ${new Date().toLocaleString('zh-CN')}\n` +
      `Node.js版本: ${process.version}\n` +
      `运行目录: ${__dirname}\n\n` +
      `✅ 通知功能测试正常！`;

    console.log('发送简单测试通知...');
    await notifier.notify(testTitle, testContent);
    console.log('✅ 简单测试通知发送完成！');
  }
}

// 执行测试
async function main() {
  const tester = new TestNotifier();

  const args = process.argv.slice(2);
  const testType = args[0] || 'file'; // 'file' 或 'simple'

  console.log('=== 通知功能测试 ===\n');

  if (testType === 'simple') {
    await tester.sendSimpleTest();
  } else if (testType === 'file') {
    await tester.sendTestNotification();
  } else {
    console.log('用法:');
    console.log('  node testNotify.js          # 使用文件测试');
    console.log('  node testNotify.js simple   # 简单测试');
    console.log('  node testNotify.js file     # 使用文件测试');
  }
}

// 运行测试
if (require.main === module) {
  main().catch((error) => {
    console.error('测试脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = TestNotifier;
