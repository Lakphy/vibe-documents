# 基础格式测试

本文档测试 Markdown 基础文本格式的渲染效果。

---

## 标题层级

# 一级标题 (H1)

## 二级标题 (H2)

### 三级标题 (H3)

#### 四级标题 (H4)

##### 五级标题 (H5)

###### 六级标题 (H6)

---

## 内联文本格式

这是一段普通文本。

这是 **加粗文本** 测试。

这是 *斜体文本* 测试。

这是 ***加粗斜体*** 测试。

这是 ~~删除线文本~~ 测试。

这是 `行内代码` 测试。

混合使用：**加粗中包含 `代码` 和 *斜体***，以及 ~~删除线中 **加粗**~~。

---

## 段落与换行

这是第一段。Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

这是第二段。Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

这是一行文本。
这是紧接的另一行（软换行）。

---

## 水平分隔线

以下是三种水平线语法：

---

***

___

---

## 转义字符

\*这不是斜体\*

\*\*这不是加粗\*\*

\`这不是行内代码\`

\[这不是链接\](url)

\# 这不是标题

---

## HTML 内联标签

<mark>高亮文本</mark>

<sub>下标</sub> 和 <sup>上标</sup>

<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd>

<abbr title="Hypertext Markup Language">HTML</abbr> 缩写标签

---

## Details / Summary 折叠

<details>
<summary>点击展开 - 基础折叠内容</summary>

这是折叠区域里的内容。支持 **所有 Markdown 格式**：

- 列表项 1
- 列表项 2
- `行内代码`

```javascript
console.log("折叠内容中的代码块");
```

</details>

<details>
<summary>嵌套折叠</summary>

外层内容

<details>
<summary>内层折叠</summary>

内层内容，支持 *斜体* 和 **加粗**。

</details>

</details>

<details open>
<summary>默认展开的折叠</summary>

这个折叠块默认是展开的（使用 `open` 属性）。

</details>

---

## 长文本段落压力测试

Loremipsumdolorsitametconsecteturadipiscingelitseddoeiusmodtemporincididuntutlaboreetdoloremagnaaliqua 这是一个没有空格的超长单词测试，用于验证文本是否会正确换行或溢出容器。

短句。很短。极短。一。

> 这段引用包含非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的文本，用于测试引用块中的文本换行效果是否正常。
