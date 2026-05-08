# 列表测试

本文档测试各种列表类型的渲染效果。

---

## 无序列表

- 项目一
- 项目二
- 项目三
- 项目四

### 不同标记符号

- 使用连字符
- 列表项

* 使用星号
* 列表项

+ 使用加号
+ 列表项

---

## 有序列表

1. 第一步：需求分析
2. 第二步：技术设计
3. 第三步：编码实现
4. 第四步：单元测试
5. 第五步：代码审查
6. 第六步：部署上线

### 非连续编号

1. 第一项
1. 第二项（源码都用 1）
1. 第三项（渲染时应自动递增）
1. 第四项

### 自定义起始编号

3. 从三开始
4. 继续
5. 结束

---

## 嵌套列表

### 无序嵌套

- 水果
  - 苹果
    - 红富士
    - 青苹果
    - 金帅
  - 香蕉
  - 橙子
    - 脐橙
    - 血橙
- 蔬菜
  - 番茄
  - 黄瓜
  - 胡萝卜
- 肉类
  - 牛肉
  - 猪肉
  - 鸡肉

### 有序嵌套

1. 前端技术栈
   1. 框架
      1. React
      2. Vue
      3. Angular
   2. 状态管理
      1. Redux
      2. Zustand
      3. Pinia
   3. 构建工具
      1. Webpack
      2. Vite
      3. Turbopack
2. 后端技术栈
   1. Node.js
   2. Go
   3. Rust
3. 数据库
   1. 关系型
      1. PostgreSQL
      2. MySQL
   2. 非关系型
      1. MongoDB
      2. Redis

### 混合嵌套

1. 准备工作
   - 安装 Node.js 18+
   - 安装 VS Code
   - 克隆代码仓库
2. 开发流程
   - 创建功能分支
     1. 从 `main` 拉取最新代码
     2. 运行 `git checkout -b feat/xxx`
   - 编写代码
   - 提交变更
     1. `git add .`
     2. `git commit -m "feat: description"`
3. 发布
   - 合并到主分支
   - 触发 CI/CD 管道

---

## 任务列表

### 项目进度

- [x] 初始化项目结构
- [x] 配置 Webpack 构建
- [x] 实现 Streamdown 预览渲染
- [x] 实现 Milkdown WYSIWYG 编辑
- [x] 实现 CodeMirror 源码编辑
- [x] 添加 Mermaid 图表支持
- [x] 添加 KaTeX 数学公式支持
- [x] 添加 Shiki 代码高亮
- [ ] 添加目录导航 (TOC)
- [ ] 支持自定义 CSS 主题
- [ ] 支持导出 PDF
- [ ] 支持导出 HTML

### 嵌套任务列表

- [x] 版本 1.0
  - [x] 核心功能
    - [x] Markdown 解析
    - [x] 实时预览
  - [x] 编辑功能
    - [x] 所见即所得
    - [x] 源码模式
  - [ ] 增强功能
    - [x] 代码高亮
    - [ ] 拼写检查
    - [ ] 自动补全
- [ ] 版本 2.0
  - [ ] AI 辅助写作
  - [ ] 协同编辑
  - [ ] 版本历史

---

## 列表中包含其他元素

### 列表中的段落

- 第一项

  这是列表项中的一个段落。列表项可以包含多个段落、代码块和其他块级元素。

  这是第二个段落。

- 第二项

  这个列表项也包含额外的段落。

### 列表中的代码块

- 安装依赖：

  ```bash
  npm install
  ```

- 启动开发服务器：

  ```bash
  npm run dev
  ```

- 运行测试：

  ```bash
  npm test
  ```

### 列表中的引用

- 关于设计：

  > 好的设计是尽可能少的设计。 —— Dieter Rams

- 关于编程：

  > 代码是写给人看的，只是恰好能被机器执行。 —— Harold Abelson

### 列表中的表格

- 版本对比：

  | 版本 | 功能 | 状态 |
  |------|------|------|
  | v0.1 | 基础预览 | ✅ |
  | v0.2 | WYSIWYG | ✅ |
  | v0.3 | 插件系统 | 🚧 |

---

## 定义列表（HTML 方式）

<dl>
  <dt>Streamdown</dt>
  <dd>高性能 Markdown 流式渲染引擎</dd>

  <dt>Milkdown</dt>
  <dd>基于 ProseMirror 的 WYSIWYG 编辑器框架</dd>

  <dt>CodeMirror</dt>
  <dd>功能强大的代码编辑器组件</dd>

  <dt>KaTeX</dt>
  <dd>快速的数学排版库</dd>
</dl>

---

## 超长列表压力测试

1. Item 01 - Lorem ipsum dolor sit amet
2. Item 02 - Consectetur adipiscing elit
3. Item 03 - Sed do eiusmod tempor
4. Item 04 - Incididunt ut labore
5. Item 05 - Et dolore magna aliqua
6. Item 06 - Ut enim ad minim veniam
7. Item 07 - Quis nostrud exercitation
8. Item 08 - Ullamco laboris nisi
9. Item 09 - Ut aliquip ex ea commodo
10. Item 10 - Consequat duis aute irure
11. Item 11 - Dolor in reprehenderit
12. Item 12 - In voluptate velit esse
13. Item 13 - Cillum dolore eu fugiat
14. Item 14 - Nulla pariatur excepteur
15. Item 15 - Sint occaecat cupidatat
16. Item 16 - Non proident sunt in
17. Item 17 - Culpa qui officia
18. Item 18 - Deserunt mollit anim
19. Item 19 - Id est laborum sed ut
20. Item 20 - Perspiciatis unde omnis
