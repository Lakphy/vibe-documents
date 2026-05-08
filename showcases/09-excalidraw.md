# Excalidraw 绘图测试

本文档测试 Excalidraw 手绘风格图形的渲染效果。
在预览模式下以只读方式展示，在 WYSIWYG 模式下可编辑。

---

## 基础图形

```excalidraw
{
  "elements": [
    {
      "id": "rect1",
      "type": "rectangle",
      "x": 50,
      "y": 50,
      "width": 200,
      "height": 100,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#a5d8ff",
      "fillStyle": "hachure",
      "strokeWidth": 2,
      "roughness": 1,
      "roundness": { "type": 3 }
    },
    {
      "id": "ellipse1",
      "type": "ellipse",
      "x": 320,
      "y": 50,
      "width": 150,
      "height": 100,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#b2f2bb",
      "fillStyle": "hachure",
      "strokeWidth": 2,
      "roughness": 1
    },
    {
      "id": "diamond1",
      "type": "diamond",
      "x": 540,
      "y": 30,
      "width": 140,
      "height": 140,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#ffec99",
      "fillStyle": "hachure",
      "strokeWidth": 2,
      "roughness": 1
    }
  ],
  "appState": {
    "viewBackgroundColor": "transparent"
  }
}
```

---

## 带文字和箭头的流程

```excalidraw
{
  "elements": [
    {
      "id": "box-start",
      "type": "rectangle",
      "x": 50,
      "y": 80,
      "width": 150,
      "height": 60,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#a5d8ff",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "roughness": 1,
      "roundness": { "type": 3 }
    },
    {
      "id": "text-start",
      "type": "text",
      "x": 85,
      "y": 97,
      "width": 80,
      "height": 26,
      "text": "开始",
      "fontSize": 20,
      "fontFamily": 1,
      "textAlign": "center",
      "strokeColor": "#1e1e1e"
    },
    {
      "id": "arrow1",
      "type": "arrow",
      "x": 200,
      "y": 110,
      "width": 80,
      "height": 0,
      "strokeColor": "#1e1e1e",
      "strokeWidth": 2,
      "roughness": 1,
      "points": [[0, 0], [80, 0]]
    },
    {
      "id": "box-process",
      "type": "rectangle",
      "x": 280,
      "y": 80,
      "width": 150,
      "height": 60,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#b2f2bb",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "roughness": 1,
      "roundness": { "type": 3 }
    },
    {
      "id": "text-process",
      "type": "text",
      "x": 315,
      "y": 97,
      "width": 80,
      "height": 26,
      "text": "处理",
      "fontSize": 20,
      "fontFamily": 1,
      "textAlign": "center",
      "strokeColor": "#1e1e1e"
    },
    {
      "id": "arrow2",
      "type": "arrow",
      "x": 430,
      "y": 110,
      "width": 80,
      "height": 0,
      "strokeColor": "#1e1e1e",
      "strokeWidth": 2,
      "roughness": 1,
      "points": [[0, 0], [80, 0]]
    },
    {
      "id": "box-end",
      "type": "rectangle",
      "x": 510,
      "y": 80,
      "width": 150,
      "height": 60,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#ffec99",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "roughness": 1,
      "roundness": { "type": 3 }
    },
    {
      "id": "text-end",
      "type": "text",
      "x": 545,
      "y": 97,
      "width": 80,
      "height": 26,
      "text": "结束",
      "fontSize": 20,
      "fontFamily": 1,
      "textAlign": "center",
      "strokeColor": "#1e1e1e"
    }
  ],
  "appState": {
    "viewBackgroundColor": "transparent"
  }
}
```

---

## 架构示意图

```excalidraw
{
  "elements": [
    {
      "id": "title",
      "type": "text",
      "x": 200,
      "y": 10,
      "width": 300,
      "height": 35,
      "text": "Vibe Documents 架构",
      "fontSize": 28,
      "fontFamily": 1,
      "textAlign": "center",
      "strokeColor": "#1e1e1e"
    },
    {
      "id": "ext-host",
      "type": "rectangle",
      "x": 30,
      "y": 70,
      "width": 250,
      "height": 200,
      "strokeColor": "#e03131",
      "backgroundColor": "#ffc9c9",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "roughness": 1,
      "roundness": { "type": 3 }
    },
    {
      "id": "ext-host-label",
      "type": "text",
      "x": 80,
      "y": 85,
      "width": 150,
      "height": 26,
      "text": "Extension Host",
      "fontSize": 18,
      "fontFamily": 1,
      "strokeColor": "#e03131"
    },
    {
      "id": "ext-ts",
      "type": "rectangle",
      "x": 55,
      "y": 125,
      "width": 200,
      "height": 40,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 1,
      "roughness": 0,
      "roundness": { "type": 3 }
    },
    {
      "id": "ext-ts-label",
      "type": "text",
      "x": 100,
      "y": 133,
      "width": 110,
      "height": 24,
      "text": "extension.ts",
      "fontSize": 16,
      "fontFamily": 3,
      "strokeColor": "#1e1e1e"
    },
    {
      "id": "provider",
      "type": "rectangle",
      "x": 55,
      "y": 180,
      "width": 200,
      "height": 40,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 1,
      "roughness": 0,
      "roundness": { "type": 3 }
    },
    {
      "id": "provider-label",
      "type": "text",
      "x": 75,
      "y": 188,
      "width": 160,
      "height": 24,
      "text": "PreviewProvider",
      "fontSize": 16,
      "fontFamily": 3,
      "strokeColor": "#1e1e1e"
    },
    {
      "id": "webview-box",
      "type": "rectangle",
      "x": 380,
      "y": 70,
      "width": 300,
      "height": 280,
      "strokeColor": "#2f9e44",
      "backgroundColor": "#c3fae8",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "roughness": 1,
      "roundness": { "type": 3 }
    },
    {
      "id": "webview-label",
      "type": "text",
      "x": 470,
      "y": 85,
      "width": 120,
      "height": 26,
      "text": "Webview",
      "fontSize": 18,
      "fontFamily": 1,
      "strokeColor": "#2f9e44"
    },
    {
      "id": "streamdown-box",
      "type": "rectangle",
      "x": 405,
      "y": 125,
      "width": 120,
      "height": 40,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 1,
      "roughness": 0,
      "roundness": { "type": 3 }
    },
    {
      "id": "streamdown-label",
      "type": "text",
      "x": 415,
      "y": 133,
      "width": 100,
      "height": 24,
      "text": "Streamdown",
      "fontSize": 14,
      "fontFamily": 3,
      "strokeColor": "#1e1e1e"
    },
    {
      "id": "milkdown-box",
      "type": "rectangle",
      "x": 540,
      "y": 125,
      "width": 120,
      "height": 40,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 1,
      "roughness": 0,
      "roundness": { "type": 3 }
    },
    {
      "id": "milkdown-label",
      "type": "text",
      "x": 560,
      "y": 133,
      "width": 80,
      "height": 24,
      "text": "Milkdown",
      "fontSize": 14,
      "fontFamily": 3,
      "strokeColor": "#1e1e1e"
    },
    {
      "id": "cm-box",
      "type": "rectangle",
      "x": 405,
      "y": 180,
      "width": 120,
      "height": 40,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 1,
      "roughness": 0,
      "roundness": { "type": 3 }
    },
    {
      "id": "cm-label",
      "type": "text",
      "x": 415,
      "y": 188,
      "width": 100,
      "height": 24,
      "text": "CodeMirror",
      "fontSize": 14,
      "fontFamily": 3,
      "strokeColor": "#1e1e1e"
    },
    {
      "id": "msg-arrow",
      "type": "arrow",
      "x": 280,
      "y": 170,
      "width": 100,
      "height": 0,
      "strokeColor": "#1971c2",
      "strokeWidth": 2,
      "roughness": 1,
      "points": [[0, 0], [100, 0]]
    },
    {
      "id": "msg-label",
      "type": "text",
      "x": 290,
      "y": 148,
      "width": 80,
      "height": 20,
      "text": "postMessage",
      "fontSize": 12,
      "fontFamily": 3,
      "strokeColor": "#1971c2"
    }
  ],
  "appState": {
    "viewBackgroundColor": "transparent"
  }
}
```

---

## 空白 / 最小 Excalidraw

```excalidraw
{
  "elements": [],
  "appState": {
    "viewBackgroundColor": "transparent"
  }
}
```

---

## 无效 JSON 测试（应显示错误提示）

```excalidraw
{ invalid json here
```
