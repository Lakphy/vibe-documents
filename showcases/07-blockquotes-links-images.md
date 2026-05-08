# 引用块、链接与图片测试

本文档测试引用块、各种链接形式和图片渲染。

---

## 引用块 (Blockquote)

### 基础引用

> 这是一段引用文本。

### 多段引用

> 这是引用的第一段。引用块可以包含多段文本。
>
> 这是引用的第二段。每段之间用空行分隔。
>
> 这是引用的第三段。

### 嵌套引用

> 一级引用
>
> > 二级引用
> >
> > > 三级引用
> > >
> > > > 四级引用：测试深层嵌套的渲染效果

### 引用中的格式化文本

> **加粗引用**
>
> *斜体引用*
>
> ~~删除线引用~~
>
> 包含 `行内代码` 的引用
>
> 包含链接的引用：[Vibe Documents](https://github.com/Lakphy/vibe-documents)

### 引用中的列表

> 引用中的无序列表：
>
> - 项目 A
> - 项目 B
> - 项目 C
>
> 引用中的有序列表：
>
> 1. 第一步
> 2. 第二步
> 3. 第三步

### 引用中的代码块

> 以下是引用中的代码示例：
>
> ```typescript
> function greet(name: string): string {
>   return `Hello, ${name}!`;
> }
> ```

### 经典名言引用

> The best way to predict the future is to invent it.
>
> — Alan Kay

> 天行健，君子以自强不息；地势坤，君子以厚德载物。
>
> — 《周易》

> Talk is cheap. Show me the code.
>
> — Linus Torvalds

---

## 链接

### 基础链接

- 行内链接：[GitHub](https://github.com)
- 带标题的链接：[MDN](https://developer.mozilla.org "Mozilla Developer Network")
- 裸 URL 自动链接：https://www.example.com
- 邮箱链接：<user@example.com>

### 参考链接

这是一段文字，其中包含 [参考链接1][ref1] 和 [参考链接2][ref2]。

[ref1]: https://github.com "GitHub"
[ref2]: https://code.visualstudio.com "VS Code"

### 文档内锚点链接

- [返回引用块部分](#引用块-blockquote)
- [跳转到图片部分](#图片)

### 链接在不同上下文中

1. 列表中的链接：[React](https://react.dev) 是一个用户界面库
2. **加粗文本中的 [链接](https://example.com)**
3. *斜体文本中的 [链接](https://example.com)*
4. `代码中不应渲染 [链接](url)`

---

## 图片

### 基础图片

![Placeholder Image](https://via.placeholder.com/600x300/3b82f6/ffffff?text=Vibe+Documents)

### 带标题的图片

![VS Code Logo](https://code.visualstudio.com/assets/images/code-stable.png "Visual Studio Code")

### 小图片

![小图标](https://via.placeholder.com/32x32/10b981/ffffff?text=OK)

### 大图片（测试 max-width 约束）

![宽图片](https://via.placeholder.com/1920x400/6366f1/ffffff?text=Wide+Image+1920x400)

### 图片链接

[![点击图片跳转](https://via.placeholder.com/300x100/f59e0b/ffffff?text=Click+Me)](https://github.com/Lakphy/vibe-documents)

### 连续多图

![图片1](https://via.placeholder.com/200x150/ef4444/ffffff?text=Red)
![图片2](https://via.placeholder.com/200x150/3b82f6/ffffff?text=Blue)
![图片3](https://via.placeholder.com/200x150/22c55e/ffffff?text=Green)

### 破损图片（404 测试）

![不存在的图片](https://example.com/nonexistent-image-12345.png)

---

## 脚注

这是一段包含脚注的文本[^1]。另一个脚注引用[^2]在这里。

还可以使用具名脚注[^note]。

[^1]: 这是第一个脚注的内容。
[^2]: 这是第二个脚注，包含 **加粗** 和 `代码`。
[^note]: 具名脚注可以使用任意标识符。
